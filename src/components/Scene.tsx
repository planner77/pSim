import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import { Vector3, Euler, Mesh, BoxHelper, Box3, LineBasicMaterial } from 'three'
import { Html, useHelper, PivotControls, Box } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'

interface ObjectData {
  position: [number, number, number];
  velocity: [number, number, number];
  type: 'cart' | 'box' | null;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
}

interface SceneProps {
  floorFriction: number
  cartBoxFriction: number
  cartWeight: number
  boxWeight: number
  maxSpeed: number
  acceleration: number
  deceleration: number
  distance: number
  isSimulating: boolean
  onObjectSelect: (objectData: ObjectData | null) => void
  onSimulationComplete?: () => void
  onSimulationUpdate?: (time: number, distance: number, speed: number) => void
}

// 초기 위치 정의
const INITIAL_CART_POSITION = [0, 0.35, 0] as [number, number, number];
// 상자와 수레 크기 기반으로 정확한 위치 계산 (수레 높이 0.5/2 + 상자 높이 0.5/2 + 약간의 여유공간)
const INITIAL_BOX_POSITION = [0, 0.6, 0] as [number, number, number];

// 수레 크기 정의
const CART_SIZE = {
  width: 2, // x축 (길이)
  height: 0.5, // y축 (높이)
  depth: 0.8, // z축 (폭)
};

// 상자 크기 정의
const BOX_SIZE = {
  width: 0.5, // x축
  height: 0.5, // y축
  depth: 0.5, // z축
};

// 바퀴 크기 정의
const WHEEL_SIZE = {
  radius: 0.1, // 바퀴 반지름
  width: 0.1,  // 바퀴 폭
};

// 바닥 높이 정의
const FLOOR_HEIGHT = -0.1;
const FLOOR_THICKNESS = 0.2;

// 바닥 상단 높이 (바닥의 상단면 높이 계산)
const FLOOR_TOP_Y = FLOOR_HEIGHT + (FLOOR_THICKNESS / 2);

// 바퀴 위치 계산 (바닥과 정확히 맞닿도록)
// 바퀴의 가장 아래쪽이 바닥 상단과 일치해야 함
const WHEEL_CENTER_Y = FLOOR_TOP_Y + WHEEL_SIZE.radius; // 바퀴 중심 높이 = 바닥 + 바퀴 반지름

// 수레 하단을 바퀴의 1/2 높이에 맞추기 위한 계산
// 바퀴 절반 높이 (바닥으로부터) = WHEEL_SIZE.radius / 2
const CART_BOTTOM_Y = FLOOR_TOP_Y + (WHEEL_SIZE.radius / 2); // 수레 바닥 높이 = 바닥 + 바퀴 반지름의 절반
const CART_CENTER_Y = CART_BOTTOM_Y + (CART_SIZE.height / 2); // 수레 중심 높이 = 수레 바닥 + 수레 높이의 절반

// 바퀴 위치 상수 재정의
const WHEEL_HALF_HEIGHT = WHEEL_SIZE.radius / 2; // 바퀴 반지름의 절반 (바닥에서부터 바퀴 높이의 절반)

// 바퀴의 x축 및 z축 위치 계산 (수레 측면에 정확히 맞닿도록)
const CART_HALF_WIDTH = CART_SIZE.width / 2; // 수레 가로 길이의 절반
const CART_HALF_DEPTH = CART_SIZE.depth / 2; // 수레 깊이의 절반
const WHEEL_HALF_WIDTH = WHEEL_SIZE.width / 2; // 바퀴 폭의 절반

// 바퀴 위치 계산 (바퀴 측면이 수레 측면에 정확히 맞닿도록)
// 앞뒤 위치 (x축) - 수레 길이의 절반(CART_HALF_WIDTH)을 기준으로 함
const WHEEL_FRONT_X = CART_HALF_WIDTH;
const WHEEL_BACK_X = -CART_HALF_WIDTH;

// 좌우 위치 (z축) - 수레 깊이의 절반(CART_HALF_DEPTH)을 기준으로 함
// 바퀴의 중심이 수레 측면에서 바퀴 폭의 절반만큼 바깥쪽으로 위치해야 바퀴 측면이 수레 측면과 정확히 맞닿음
const WHEEL_LEFT_Z = CART_HALF_DEPTH + WHEEL_HALF_WIDTH; // 왼쪽 바퀴 z 위치 (수레 오른쪽 측면 + 바퀴 폭의 절반)
const WHEEL_RIGHT_Z = -(CART_HALF_DEPTH + WHEEL_HALF_WIDTH); // 오른쪽 바퀴 z 위치 (수레 왼쪽 측면 - 바퀴 폭의 절반)

// 초기 위치 재계산
const RECALCULATED_CART_POSITION = [0, CART_CENTER_Y, 0] as [number, number, number];
const RECALCULATED_BOX_POSITION = [0, CART_CENTER_Y + (CART_SIZE.height / 2) + (BOX_SIZE.height / 2), 0] as [number, number, number];

// 바퀴 회전 관련 설정
const WHEEL_ROTATION_AXIS = [1, 0, 0]; // x축 방향으로 회전
const WHEEL_INITIAL_ROTATION = [0, 0, Math.PI / 2]; // 초기 회전 (z축으로 90도)

export default function Scene({
  floorFriction,
  cartBoxFriction,
  cartWeight,
  boxWeight,
  maxSpeed,
  acceleration,
  deceleration,
  distance,
  isSimulating,
  onObjectSelect,
  onSimulationComplete,
  onSimulationUpdate
}: SceneProps) {
  const cartRef = useRef<any>(null)
  const boxRef = useRef<any>(null)
  const cartMeshRef = useRef<Mesh>(null)
  const boxMeshRef = useRef<Mesh>(null)
  const [selectedObject, setSelectedObject] = useState<'cart' | 'box' | null>(null)
  const [prevIsSimulating, setPrevIsSimulating] = useState(false);
  const [resetJustApplied, setResetJustApplied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<Vector3 | null>(null);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [frontRightWheelPos, setFrontRightWheelPos] = useState<{x: number, y: number, z: number}>({x: 0, y: 0, z: 0});
  
  // 배경 클릭 처리를 위한 Three.js 씬 가져오기
  const { gl, scene, camera } = useThree()
  const initialCameraPosition = useRef(camera.position.clone()); // 초기 카메라 위치 저장
  const simulationStartCameraPosition = useRef<Vector3 | null>(null); // 시뮬레이션 시작 시점의 카메라 위치
  const simulationStartCartPosition = useRef<Vector3 | null>(null); // 시뮬레이션 시작 시점의 수레 위치
  const cameraOffset = useRef<Vector3 | null>(null); // 카메라와 수레 사이의 오프셋
  const simulationStartCameraDirection = useRef<Vector3 | null>(null); // 시뮬레이션 시작 시점의 카메라 방향
  
  // 시뮬레이션 정보 관련 상태 추가
  const simulationStartTime = useRef<number | null>(null);
  const initialCartPosition = useRef<Vector3 | null>(null);
  
  // isSimulating 상태 변화 감지
  useEffect(() => {
    // 시뮬레이션 중지 -> 시작 (시작 버튼 클릭 시)
    if (!prevIsSimulating && isSimulating) {
      if (cartRef.current) {
        // 수레의 현재 위치 저장
        const cartPosition = cartRef.current.translation();
        simulationStartCartPosition.current = new Vector3(cartPosition.x, cartPosition.y, cartPosition.z);
        
        // 시작 시간 기록
        simulationStartTime.current = Date.now() / 1000; // 초 단위로 변환
        
        // 초기 위치 저장 (거리 계산용)
        initialCartPosition.current = new Vector3(cartPosition.x, cartPosition.y, cartPosition.z);
        
        // 시뮬레이션 시작 시 현재 카메라 위치 저장
        simulationStartCameraPosition.current = camera.position.clone();
        
        // 카메라와 수레 사이의 오프셋 계산 (시작 시점 기준)
        cameraOffset.current = new Vector3(
          camera.position.x - cartPosition.x,
          camera.position.y - cartPosition.y,
          camera.position.z - cartPosition.z
        );
        
        // 현재 카메라가 바라보는 방향 저장
        const direction = new Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        direction.normalize();
        simulationStartCameraDirection.current = direction.clone();
      }
    }
    
    // 시뮬레이션 시작 -> 중지 (리셋)
    if (prevIsSimulating && !isSimulating) {
      // 시뮬레이션 정보 초기화
      simulationStartTime.current = null;
      initialCartPosition.current = null;
      
      // 물리 엔진 비활성화
      setPhysicsEnabled(false);
      
      // 타이머를 사용하여 약간의 지연 후 리셋 시작 (물리 엔진이 완전히 중지된 후)
      setTimeout(() => {
        // 리셋 시작
        resetSimulation();
        
        // 리셋 후 상태 플래그 설정
        setResetJustApplied(true);
        
        // 카메라 위치 초기화
        camera.position.copy(initialCameraPosition.current);
        
        // 저장된 카메라 관련 데이터 초기화
        simulationStartCameraPosition.current = null;
        simulationStartCartPosition.current = null;
        cameraOffset.current = null;
        simulationStartCameraDirection.current = null;
        
        // 리셋 후 물리 엔진 다시 활성화 (약간의 지연 후)
        if (resetTimerRef.current) {
          window.clearTimeout(resetTimerRef.current);
        }
        
        resetTimerRef.current = window.setTimeout(() => {
          setResetJustApplied(false);
          setPhysicsEnabled(true);
          resetTimerRef.current = null;
        }, 1000);
      }, 100); // 약간의 지연으로 물리 엔진 비활성화 이후 리셋 수행
    }
    
    setPrevIsSimulating(isSimulating);
  }, [isSimulating]);
  
  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);
  
  // 시뮬레이션 리셋 함수
  const resetSimulation = () => {
    if (cartRef.current) {
      // 이전 상태를 완전히 날려버리기 위해 여러 번 값을 설정
      
      // 수레 회전 초기화 (완전한 초기화를 위해)
      cartRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 });
      
      // 속도 및 회전 속도 정확히 0으로 설정
      cartRef.current.setLinvel({ x: 0, y: 0, z: 0 });
      cartRef.current.setAngvel({ x: 0, y: 0, z: 0 });
      
      // 수레 위치와 속도 초기화 (정확하게 초기 위치로 이동)
      cartRef.current.wakeUp(); // 잠든 물리 객체 깨우기
      cartRef.current.setTranslation({
        x: RECALCULATED_CART_POSITION[0],
        y: RECALCULATED_CART_POSITION[1],
        z: RECALCULATED_CART_POSITION[2]
      });
      
      // 한번 더 설정하여 확실히 초기화
      cartRef.current.setLinvel({ x: 0, y: 0, z: 0 });
      cartRef.current.setAngvel({ x: 0, y: 0, z: 0 });
      
      // 수레 위치 확인 후, 상자 위치 계산
      const cartPosition = cartRef.current.translation();
      
      // 수레 상면 높이 계산 (y + 수레 높이의 절반)
      const cartTopSurfaceHeight = cartPosition.y + (CART_SIZE.height / 2);
      
      // 상자 바닥이 수레 상면과 일치하도록 계산 (상자 중심점이 상자 높이의 절반만큼 위에 있어야 함)
      const boxYPosition = cartTopSurfaceHeight + (BOX_SIZE.height / 2);
      
      if (boxRef.current) {
        // 상자 회전 각도 초기화
        boxRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 });
        
        // 상자 속도 초기화
        boxRef.current.setLinvel({ x: 0, y: 0, z: 0 });
        boxRef.current.setAngvel({ x: 0, y: 0, z: 0 });
        
        // 상자 위치를 수레 중앙 상단으로 설정
        boxRef.current.wakeUp(); // 잠든 물리 객체 깨우기
        boxRef.current.setTranslation({
          x: cartPosition.x,
          y: boxYPosition,
          z: cartPosition.z
        });
        
        // 한번 더 속도 초기화
        boxRef.current.setLinvel({ x: 0, y: 0, z: 0 });
        boxRef.current.setAngvel({ x: 0, y: 0, z: 0 });
      }
      
      // 바퀴 회전 초기화
      setWheelRotation(0);
    }
  };
  
  // 객체 선택 처리
  const handleCartClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    setSelectedObject('cart')
    if (cartRef.current) {
      const position = cartRef.current.translation() as Vector3;
      const velocity = cartRef.current.linvel() as Vector3;
      setSelectedPosition(new Vector3(position.x, position.y, position.z));
      onObjectSelect({
        position: [position.x, position.y, position.z],
        velocity: [velocity.x, velocity.y, velocity.z],
        type: 'cart',
        dimensions: {
          width: CART_SIZE.width,
          height: CART_SIZE.height,
          depth: CART_SIZE.depth
        }
      })
    }
  }
  
  const handleBoxClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    setSelectedObject('box')
    if (boxRef.current) {
      const position = boxRef.current.translation() as Vector3;
      const velocity = boxRef.current.linvel() as Vector3;
      setSelectedPosition(new Vector3(position.x, position.y, position.z));
      onObjectSelect({
        position: [position.x, position.y, position.z],
        velocity: [velocity.x, velocity.y, velocity.z],
        type: 'box',
        dimensions: {
          width: BOX_SIZE.width,
          height: BOX_SIZE.height,
          depth: BOX_SIZE.depth
        }
      })
    }
  }
  
  // 배경 클릭시 선택 해제
  const handleBackgroundClick = (e: MouseEvent) => {
    if (e.target && (e.target as any).userData && (e.target as any).userData.type !== 'cart' && (e.target as any).userData.type !== 'box') {
      setSelectedObject(null)
      setSelectedPosition(null)
      onObjectSelect(null)
    }
  }
  
  // 배경 클릭 이벤트 설정
  gl.domElement.addEventListener('click', handleBackgroundClick)
  
  useFrame((state, delta) => {
    // 물리 엔진이 비활성화되었거나 시뮬레이션이 아닌 경우 물리 계산 스킵
    if (!physicsEnabled || !isSimulating) {
      return;
    }
    
    // 물리 시뮬레이션 로직 구현
    if (cartRef.current) {
      const currentVelocity = cartRef.current.linvel()
      const cartPosition = cartRef.current.translation();
      
      // 카메라 위치 업데이트 - 수레를 따라가도록 설정
      if (isSimulating && simulationStartCameraPosition.current && 
          cameraOffset.current && simulationStartCameraDirection.current) {
        
        // 이전 위치에서 새 위치로 부드럽게 이동하기 위한 보간 계수
        const smoothFactor = 0.1; // 낮을수록 더 부드럽게 이동 (0에 가까우면 느리게, 1에 가까우면 즉시 이동)
        
        // 목표 카메라 위치 계산
        const targetCameraX = cartPosition.x + cameraOffset.current.x;
        
        // 현재 위치에서 목표 위치로 부드럽게 이동 (x축만)
        const newX = camera.position.x + (targetCameraX - camera.position.x) * smoothFactor;
        
        // 새 카메라 위치 적용 (부드러운 이동)
        camera.position.x = newX;
        // y와 z 좌표는 시작 시점의 값을 유지
        camera.position.y = simulationStartCameraPosition.current.y;
        camera.position.z = simulationStartCameraPosition.current.z;
        
        // 타겟 위치 계산 - 수레의 현재 위치를 기준으로
        const targetPosition = new Vector3(
          cartPosition.x,
          cartPosition.y,
          cartPosition.z
        );
        
        // 카메라가 수레를 바라보도록 설정
        camera.lookAt(targetPosition);
      }
      
      // 가속도 적용 (수레 무게를 고려한 힘 계산)
      if (currentVelocity.x < maxSpeed) {
        cartRef.current.applyImpulse(
          { x: acceleration * delta * cartWeight, y: 0, z: 0 },
          true
        )
      }
      
      // 바퀴 회전 업데이트 - 속도에 비례하여 x+ 방향으로 회전하도록 수정
      const wheelRotationSpeed = currentVelocity.x * 10; // 회전 속도 계수 조정
      setWheelRotation(prev => prev + wheelRotationSpeed * delta);
      
      // 전방 우측 바퀴 위치 계산 및 콘솔에 출력
      const frontRightWheelX = cartPosition.x + WHEEL_FRONT_X;
      const frontRightWheelY = WHEEL_CENTER_Y;
      const frontRightWheelZ = cartPosition.z + WHEEL_RIGHT_Z;
      
      // 값을 상태에 저장 (디버그 출력용)
      setFrontRightWheelPos({
        x: parseFloat(frontRightWheelX.toFixed(3)),
        y: parseFloat(frontRightWheelY.toFixed(3)),
        z: parseFloat(frontRightWheelZ.toFixed(3))
      });
      
      // 콘솔에 로그 출력 (매 프레임마다 출력되지 않도록 속도 조절)
      if (Math.floor(state.clock.elapsedTime * 10) % 5 === 0) {
        console.log(
          `전방 우측 바퀴 위치 - X: ${frontRightWheelX.toFixed(3)}, Y: ${frontRightWheelY.toFixed(3)}, Z: ${frontRightWheelZ.toFixed(3)}, 회전: ${wheelRotation.toFixed(2)}`
        );
      }
      
      // 상자 관리
      if (boxRef.current) {
        const boxPosition = boxRef.current.translation();
        const cartPosition = cartRef.current.translation();
        
        // 리셋 직후에는 상자가 수레 위에 고정되도록 강제 설정
        if (resetJustApplied) {
          // 수레 상면 높이 계산
          const cartTopSurfaceHeight = cartPosition.y + (CART_SIZE.height / 2);
          // 상자 바닥이 수레 상면과 일치하도록 계산
          const boxYPosition = cartTopSurfaceHeight + (BOX_SIZE.height / 2);
          
          // 상자의 위치를 수레의 중앙에 고정
          boxRef.current.setTranslation({
            x: cartPosition.x,
            y: boxYPosition,
            z: cartPosition.z
          });
          
          // 속도와 회전도 0으로 유지 (수레의 x축 속도만 유지)
          boxRef.current.setLinvel({ x: currentVelocity.x, y: 0, z: 0 });
          boxRef.current.setAngvel({ x: 0, y: 0, z: 0 });
          boxRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 });
        } else {
          // 일반 시뮬레이션 중에는 상자가 수레 위에서 너무 많이 벗어나지 않도록 조절
          
          // 상자가 수레 범위 내에 있을 때만 안정화 (x축으로 수레 길이 내에 있는지 확인)
          const isBoxAboveCart = 
            Math.abs(boxPosition.x - cartPosition.x) < 0.9 && // 수레 길이의 절반보다 작게 설정
            Math.abs(boxPosition.z - cartPosition.z) < 0.4;   // 수레 폭의 절반보다 작게 설정
            
          if (isBoxAboveCart) {
            // 상자의 회전을 안정화
            const boxRotation = boxRef.current.rotation();
            if (Math.abs(boxRotation.x) > 0.01 || Math.abs(boxRotation.z) > 0.01) {
              boxRef.current.setRotation({ x: 0, y: boxRotation.y, z: 0, w: boxRotation.w });
            }
            
            // 상자가 수레 위에서 튕겨나가는 것을 방지
            const boxVelocity = boxRef.current.linvel();
            // 상자의 Y축 속도가 너무 크면 감소시킴
            if (Math.abs(boxVelocity.y) > 1) {
              boxRef.current.setLinvel({ 
                x: boxVelocity.x, 
                y: boxVelocity.y * 0.7, // Y축 속도 더 많이 감소
                z: boxVelocity.z 
              });
            }
          }
        }
      }
      
      // 감속도 적용 (목표 거리에 도달 시)
      if (cartPosition.x >= distance) {
        cartRef.current.applyImpulse(
          { x: -deceleration * delta * cartWeight, y: 0, z: 0 },
          true
        )
        
        // 수레가 완전히 멈추면 시뮬레이션 자동 종료
        if (Math.abs(currentVelocity.x) < 0.1) {
          // 리셋 함수 직접 호출 방지를 위해 1프레임 이후에 시뮬레이션 종료
          setTimeout(() => {
            // 시뮬레이션 종료 콜백 호출
            onSimulationComplete?.();
          }, 100);
        }
      }
      
      // 선택된 객체의 정보 업데이트
      if (selectedObject === 'cart' && cartRef.current) {
        const position = cartRef.current.translation();
        const velocity = cartRef.current.linvel();
        setSelectedPosition(new Vector3(position.x, position.y, position.z));
        onObjectSelect({
          position: [position.x, position.y, position.z],
          velocity: [velocity.x, velocity.y, velocity.z],
          type: 'cart',
          dimensions: {
            width: CART_SIZE.width,
            height: CART_SIZE.height,
            depth: CART_SIZE.depth
          }
        })
      } else if (selectedObject === 'box' && boxRef.current) {
        const position = boxRef.current.translation();
        const velocity = boxRef.current.linvel();
        setSelectedPosition(new Vector3(position.x, position.y, position.z));
        onObjectSelect({
          position: [position.x, position.y, position.z],
          velocity: [velocity.x, velocity.y, velocity.z],
          type: 'box',
          dimensions: {
            width: BOX_SIZE.width,
            height: BOX_SIZE.height,
            depth: BOX_SIZE.depth
          }
        })
      }
    }
    
    // 시뮬레이션 중일 때만 정보 업데이트
    if (isSimulating && cartRef.current && onSimulationUpdate && simulationStartTime.current && initialCartPosition.current) {
      // 경과 시간 계산
      const currentTime = Date.now() / 1000; // 초 단위로 변환
      const elapsedTime = currentTime - simulationStartTime.current;
      
      // 현재 수레 위치 및 속도 가져오기
      const cartPosition = cartRef.current.translation();
      const cartVelocity = cartRef.current.linvel();
      
      // 이동 거리 계산 (x 축 방향 거리)
      const currentCartPos = new Vector3(cartPosition.x, cartPosition.y, cartPosition.z);
      const travelDistance = Math.abs(currentCartPos.x - initialCartPosition.current.x);
      
      // 현재 속도 계산 (x 축 방향 속도의 절대값)
      const currentSpeed = Math.abs(cartVelocity.x);
      
      // 정보 업데이트
      onSimulationUpdate(elapsedTime, travelDistance, currentSpeed);
      
      // 목표 거리에 도달했는지 확인
      if (travelDistance >= distance && onSimulationComplete) {
        onSimulationComplete();
      }
    }
  })

  return (
    <>
      {/* 바닥 */}
      <RigidBody type="fixed" colliders="cuboid" friction={floorFriction}>
        <mesh position={[50, FLOOR_HEIGHT, 0]} rotation={[0, 0, 0]} receiveShadow>
          <boxGeometry args={[200, FLOOR_THICKNESS, 4]} />
          <meshStandardMaterial color="#999999" />
        </mesh>
      </RigidBody>
      
      {/* 수레 (본체와 바퀴를 하나의 객체로 통합) */}
      <RigidBody 
        ref={cartRef} 
        colliders="cuboid" 
        position={RECALCULATED_CART_POSITION} 
        mass={cartWeight}
        friction={cartBoxFriction}
        type={physicsEnabled ? "dynamic" : "fixed"}
      >
        {/* 수레 본체 */}
        <mesh 
          ref={cartMeshRef}
          userData={{ type: 'cart' }} 
          onClick={handleCartClick} 
          castShadow 
          receiveShadow
        >
          <boxGeometry args={[CART_SIZE.width, CART_SIZE.height, CART_SIZE.depth]} />
          <meshStandardMaterial color={selectedObject === 'cart' ? "#4299E1" : "#1565C0"} />
        </mesh>

        {/* 앞쪽 왼쪽 바퀴 */}
        <mesh 
          castShadow 
          position={[WHEEL_FRONT_X, WHEEL_CENTER_Y - CART_CENTER_Y, WHEEL_LEFT_Z]} 
          rotation={[Math.PI / 2, wheelRotation, 0]}
        >
          <cylinderGeometry args={[WHEEL_SIZE.radius, WHEEL_SIZE.radius, WHEEL_SIZE.width, 16]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
        
        {/* 앞쪽 오른쪽 바퀴 */}
        <mesh 
          castShadow 
          position={[WHEEL_FRONT_X, WHEEL_CENTER_Y - CART_CENTER_Y, WHEEL_RIGHT_Z]} 
          rotation={[Math.PI / 2, wheelRotation, 0]}
        >
          <cylinderGeometry args={[WHEEL_SIZE.radius, WHEEL_SIZE.radius, WHEEL_SIZE.width, 16]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
        
        {/* 뒤쪽 왼쪽 바퀴 */}
        <mesh 
          castShadow 
          position={[WHEEL_BACK_X, WHEEL_CENTER_Y - CART_CENTER_Y, WHEEL_LEFT_Z]} 
          rotation={[Math.PI / 2, wheelRotation, 0]}
        >
          <cylinderGeometry args={[WHEEL_SIZE.radius, WHEEL_SIZE.radius, WHEEL_SIZE.width, 16]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
        
        {/* 뒤쪽 오른쪽 바퀴 */}
        <mesh 
          castShadow 
          position={[WHEEL_BACK_X, WHEEL_CENTER_Y - CART_CENTER_Y, WHEEL_RIGHT_Z]} 
          rotation={[Math.PI / 2, wheelRotation, 0]}
        >
          <cylinderGeometry args={[WHEEL_SIZE.radius, WHEEL_SIZE.radius, WHEEL_SIZE.width, 16]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </RigidBody>
      
      {/* 상자 */}
      <RigidBody 
        ref={boxRef} 
        colliders="cuboid" 
        position={RECALCULATED_BOX_POSITION} 
        mass={boxWeight}
        friction={cartBoxFriction}
        type={physicsEnabled ? "dynamic" : "fixed"}
      >
        <mesh 
          ref={boxMeshRef}
          userData={{ type: 'box' }} 
          onClick={handleBoxClick} 
          castShadow
        >
          <boxGeometry args={[BOX_SIZE.width, BOX_SIZE.height, BOX_SIZE.depth]} />
          <meshStandardMaterial color={selectedObject === 'box' ? "#FC8181" : "#C53030"} />
        </mesh>
      </RigidBody>
      
      {/* 바운딩 박스 및 원점 표시 */}
      {selectedPosition && !isSimulating && (
        <>
          {/* 원점 표시 (작은 구체) */}
          <mesh position={selectedPosition}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} />
          </mesh>
          
          {/* XYZ 축 기즈모 */}
          <group position={selectedPosition}>
            {/* X축 (빨간색) */}
            <mesh position={[0.25, 0, 0]}>
              <boxGeometry args={[0.5, 0.01, 0.01]} />
              <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
            </mesh>
            
            {/* Y축 (녹색) */}
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[0.01, 0.5, 0.01]} />
              <meshStandardMaterial color="green" emissive="green" emissiveIntensity={0.5} />
            </mesh>
            
            {/* Z축 (파란색) */}
            <mesh position={[0, 0, 0.25]}>
              <boxGeometry args={[0.01, 0.01, 0.5]} />
              <meshStandardMaterial color="blue" emissive="blue" emissiveIntensity={0.5} />
            </mesh>
            
            {/* 축 라벨 */}
            <Html position={[0.55, 0, 0]} center>
              <div style={{ color: 'red', fontWeight: 'bold' }}>X</div>
            </Html>
            
            <Html position={[0, 0.55, 0]} center>
              <div style={{ color: 'green', fontWeight: 'bold' }}>Y</div>
            </Html>
            
            <Html position={[0, 0, 0.55]} center>
              <div style={{ color: 'blue', fontWeight: 'bold' }}>Z</div>
            </Html>
          </group>
          
          {/* 바운딩 박스 (선택된 객체에 따라 크기 설정) */}
          {selectedObject && (
            <mesh position={selectedPosition} renderOrder={1000}>
              <boxGeometry 
                args={[
                  selectedObject === 'cart' ? CART_SIZE.width : BOX_SIZE.width,
                  selectedObject === 'cart' ? CART_SIZE.height : BOX_SIZE.height,
                  selectedObject === 'cart' ? CART_SIZE.depth : BOX_SIZE.depth
                ]} 
              />
              <meshBasicMaterial 
                color={selectedObject === 'cart' ? "#4299E1" : "#FC8181"} 
                wireframe={true}
                transparent={true}
                opacity={0.8}
              />
            </mesh>
          )}
        </>
      )}
      
      {/* 조명 */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1} 
        castShadow 
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048}
      />
    </>
  )
} 