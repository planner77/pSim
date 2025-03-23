import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { OrbitControls } from '@react-three/drei'
import { 
  ChakraProvider, 
  Box, 
  VStack, 
  Text, 
  Button, 
  HStack, 
  defaultSystem,
  Heading,
  Flex
} from '@chakra-ui/react'
import {
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/number-input'
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@chakra-ui/slider'
import {
  FormControl,
  FormLabel
} from '@chakra-ui/form-control'
import { Icon } from '@chakra-ui/icon'
import { useState } from 'react'
import Scene from './components/Scene'
import { FiSliders, FiTruck, FiPackage, FiZap, FiTrendingUp, FiTrendingDown, FiNavigation } from 'react-icons/fi'

type ObjectType = 'cart' | 'box' | null;

interface ObjectData {
  position: [number, number, number];
  velocity: [number, number, number];
  type: ObjectType;
  dimensions?: { width: number; height: number; depth: number };
  mass?: number;
  angularVelocity?: [number, number, number];
}

function App() {
  const [floorFriction, setFloorFriction] = useState(0.5)
  const [cartBoxFriction, setCartBoxFriction] = useState(0.5)
  const [cartWeight, setCartWeight] = useState(10)
  const [boxWeight, setBoxWeight] = useState(5)
  const [maxSpeed, setMaxSpeed] = useState(10)
  const [acceleration, setAcceleration] = useState(5)
  const [deceleration, setDeceleration] = useState(3)
  const [distance, setDistance] = useState(100)
  const [isSimulating, setIsSimulating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedObject, setSelectedObject] = useState<ObjectData | null>(null)
  const [activeTab, setActiveTab] = useState<number>(0)
  
  // 시뮬레이션 정보 상태 추가
  const [simulationTime, setSimulationTime] = useState<number>(0)
  const [simulationDistance, setSimulationDistance] = useState<number>(0)
  const [simulationSpeed, setSimulationSpeed] = useState<number>(0)

  const handleStart = () => {
    // 시뮬레이션 시작 시 정보 초기화
    setSimulationTime(0)
    setSimulationDistance(0)
    setSimulationSpeed(0)
    setIsSimulating(true)
    setIsPaused(false)
  }

  const handleStop = () => {
    setIsPaused(true)
    // isSimulating은 false로 설정하면 안 됩니다 - 주석 처리
    // setIsSimulating(false)
  }

  const handleReset = () => {
    setIsSimulating(false)
    setIsPaused(false)
    setSelectedObject(null)
    // 시뮬레이션 정보 초기화
    setSimulationTime(0)
    setSimulationDistance(0)
    setSimulationSpeed(0)
  }

  const handleSimulationComplete = () => {
    setIsSimulating(false)
  }

  const handleObjectSelect = (objectData: ObjectData | null) => {
    setSelectedObject(objectData)
  }

  // 시뮬레이션 정보 업데이트 핸들러 추가
  const handleSimulationUpdate = (time: number, cartDistance: number, cartSpeed: number) => {
    setSimulationTime(time)
    setSimulationDistance(cartDistance)
    setSimulationSpeed(cartSpeed)
  }

  const handleFloorFrictionChange = (val: number) => {
    setFloorFriction(val)
  }

  const handleCartBoxFrictionChange = (val: number) => {
    setCartBoxFriction(val)
  }

  const handleCartWeightChange = (val: number) => {
    setCartWeight(val)
  }

  const handleBoxWeightChange = (val: number) => {
    setBoxWeight(val)
  }

  const handleMaxSpeedChange = (val: number) => {
    setMaxSpeed(val)
  }

  const handleAccelerationChange = (val: number) => {
    setAcceleration(val)
  }

  const handleDecelerationChange = (val: number) => {
    setDeceleration(val)
  }

  const handleDistanceChange = (val: number) => {
    setDistance(val)
  }

  return (
    <ChakraProvider value={defaultSystem}>
      <VStack h="100vh" p={4} gap={4}>
        <Flex w="100%" justify="space-between" align="center" mb={2}>
          <Heading size="md">물리 시뮬레이션</Heading>
          <HStack gap={4}>
            <Button 
              size="lg" 
              colorScheme="green" 
              onClick={handleStart} 
              disabled={isSimulating && !isPaused}
              fontSize="xl"
              fontWeight="bold"
              py={6}
              px={8}
              borderRadius="lg"
              boxShadow="0 4px 6px rgba(0, 0, 0, 0.1)"
              _hover={{ transform: "translateY(-2px)", boxShadow: "0 6px 8px rgba(0, 0, 0, 0.15)" }}
              _active={{ transform: "translateY(0)", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
              transition="all 0.2s"
              bg="green.500"
              color="white"
            >
              <Box as="span" fontSize="2xl" mr={2}>▶</Box> 시작
            </Button>
            <Button 
              size="lg" 
              colorScheme="yellow" 
              onClick={handleStop} 
              disabled={!isSimulating}
              fontSize="xl"
              fontWeight="bold"
              py={6}
              px={8}
              borderRadius="lg"
              boxShadow="0 4px 6px rgba(0, 0, 0, 0.1)"
              _hover={{ transform: "translateY(-2px)", boxShadow: "0 6px 8px rgba(0, 0, 0, 0.15)" }}
              _active={{ transform: "translateY(0)", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
              transition="all 0.2s"
              bg="yellow.500"
              color="white"
            >
              <Box as="span" fontSize="2xl" mr={2}>⏸</Box> 정지
            </Button>
            <Button 
              size="lg" 
              colorScheme="red" 
              onClick={handleReset} 
              disabled={!isSimulating && !isPaused}
              fontSize="xl"
              fontWeight="bold"
              py={6}
              px={8}
              borderRadius="lg"
              boxShadow="0 4px 6px rgba(0, 0, 0, 0.1)"
              _hover={{ transform: "translateY(-2px)", boxShadow: "0 6px 8px rgba(0, 0, 0, 0.15)" }}
              _active={{ transform: "translateY(0)", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)" }}
              transition="all 0.2s"
              bg="red.500"
              color="white"
            >
              <Box as="span" fontSize="2xl" mr={2}>⟲</Box> 재설정
            </Button>
          </HStack>
        </Flex>

        <Flex w="100%" h="calc(100vh - 120px)" gap={4}>
          {/* 시뮬레이션 캔버스 영역 (3/4) */}
          <Box 
            w="75%" 
            h="100%" 
            bg="gray.100" 
            borderRadius="md" 
            overflow="hidden"
            border="3px solid"
            borderColor={isSimulating ? "green.400" : isPaused ? "yellow.400" : "blue.400"}
            boxShadow="0 4px 12px rgba(0, 0, 0, 0.15)"
            position="relative"
          >
            <Box 
              id="simulation-status"
              position="absolute" 
              top={4} 
              right={4} 
              bg={isSimulating ? "green.500" : isPaused ? "yellow.500" : "blue.500"} 
              color="white" 
              px={3} 
              py={2} 
              borderRadius="md"
              fontWeight="bold"
              zIndex={10}
              boxShadow="0 2px 4px rgba(0, 0, 0, 0.2)"
            >
              {isSimulating ? "시뮬레이션 진행 중" : isPaused ? "시뮬레이션 일시 정지" : "준비 완료"}
            </Box>
            <Box
              id="simulation-info"
              position="absolute"
              top={16}
              right={4}
              bg="gray.700"
              color="white"
              px={3}
              py={2}
              borderRadius="md"
              fontWeight="bold"
              zIndex={10}
              boxShadow="0 2px 4px rgba(0, 0, 0, 0.2)"
              opacity={0.9}
            >
              <VStack align="flex-start" gap={1}>
                <Text fontSize="sm">진행 시간: {isSimulating || isPaused ? simulationTime.toFixed(1) : "0.0"}초</Text>
                <Text fontSize="sm">이동 거리: {isSimulating || isPaused ? simulationDistance.toFixed(1) : "0.0"}m</Text>
                <Text fontSize="sm">현재 속도: {isSimulating || isPaused ? simulationSpeed.toFixed(1) : "0.0"}m/s</Text>
              </VStack>
            </Box>
            <Canvas shadows camera={{ position: [10, 10, 10], fov: 50 }}>
              <Physics gravity={[0, -9.81, 0]}>
                <Scene 
                  floorFriction={floorFriction}
                  cartBoxFriction={cartBoxFriction}
                  cartWeight={cartWeight}
                  boxWeight={boxWeight}
                  maxSpeed={maxSpeed}
                  acceleration={acceleration}
                  deceleration={deceleration}
                  distance={distance}
                  isSimulating={isSimulating}
                  isPaused={isPaused}
                  onObjectSelect={handleObjectSelect}
                  onSimulationComplete={handleSimulationComplete}
                  onSimulationUpdate={handleSimulationUpdate}
                />
              </Physics>
              <OrbitControls />
            </Canvas>
          </Box>
          
          {/* 컨트롤 영역 (1/4) */}
          <VStack w="25%" h="100%" gap={4}>
            <VStack w="100%" borderRadius="lg" overflow="hidden" bg="white" boxShadow="0 2px 8px rgba(0, 0, 0, 0.08)" border="1px solid" borderColor="gray.200">
              <Flex mb={5} gap={2}>
                <Button
                  flex="1"
                  variant={activeTab === 0 ? "solid" : "outline"}
                  colorScheme="teal"
                  onClick={() => setActiveTab(0)}
                  borderRadius="lg"
                  py={5}
                  fontSize="lg"
                  fontWeight="bold"
                  color={activeTab === 0 ? "white" : "teal.700"}
                  bg={activeTab === 0 ? "teal.600" : "transparent"}
                  _hover={{ 
                    bg: activeTab === 0 ? "teal.600" : "teal.50",
                    color: activeTab === 0 ? "white" : "teal.800"
                  }}
                  position="relative"
                  role="group"
                  mb={1}
                  boxShadow={activeTab === 0 ? "md" : "none"}
                >
                  <VStack gap={2}>
                    <Text fontSize="lg">시뮬레이션 설정</Text>
                  </VStack>
                </Button>
                <Button
                  flex="1"
                  variant={activeTab === 1 ? "solid" : "outline"}
                  colorScheme="teal"
                  onClick={() => setActiveTab(1)}
                  borderRadius="lg"
                  py={5}
                  fontSize="lg"
                  fontWeight="bold"
                  position="relative"
                  color={activeTab === 1 ? "white" : "teal.700"}
                  bg={activeTab === 1 ? "teal.600" : "transparent"}
                  _hover={{ 
                    bg: activeTab === 1 ? "teal.600" : "teal.50",
                    color: activeTab === 1 ? "white" : "teal.800"
                  }}
                  role="group"
                  mb={1}
                  boxShadow={activeTab === 1 ? "md" : "none"}
                >
                  <VStack gap={2}>
                    <Text fontSize="lg">객체 정보</Text>
                    {selectedObject && (
                      <VStack gap={1}>
                        <Text fontSize="sm">유형: {selectedObject.type === 'cart' ? '수레' : '상자'}</Text>
                        <Text fontSize="sm">위치: {selectedObject.position[0].toFixed(1)}, {selectedObject.position[1].toFixed(1)}</Text>
                        <Text fontSize="sm">속도: {selectedObject.velocity[0].toFixed(1)}m/s</Text>
                      </VStack>
                    )}
                  </VStack>
                  {selectedObject && (
                    <Box
                      position="absolute"
                      top="-5px"
                      right="-5px"
                      px={1.5}
                      py={0.5}
                      bg="green.500"
                      color="white"
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="bold"
                      zIndex={2}
                    >
                      ●
                    </Box>
                  )}
                </Button>
              </Flex>
              
              <Box w="100%" h="calc(100vh - 180px)" p={4} overflowY="auto">
                {activeTab === 0 && (
                  <VStack align="stretch" gap={6}>
                    <Box>
                      <Heading 
                        as="h3" 
                        size="md" 
                        mb={4} 
                        color="blue.600" 
                        borderBottom="2px solid" 
                        borderColor="blue.200" 
                        pb={2} 
                        fontSize="lg" 
                        fontWeight="bold"
                        display="flex"
                        alignItems="center"
                        gap={2}
                      >
                        <Box bg="blue.100" p={1.5} borderRadius="md">
                          <Icon as={FiSliders} color="blue.700" boxSize="18px" />
                        </Box>
                        물리 속성
                      </Heading>
                      <VStack align="stretch" gap={4} mt={3} px={1}>
                        <FormControl>
                          <FormLabel fontWeight="medium" color="gray.700">
                            바닥-수레 마찰 계수
                          </FormLabel>
                          <NumberInput
                            value={floorFriction}
                            onChange={(_, val) => handleFloorFrictionChange(val)}
                            step={0.01}
                            min={0}
                            max={1}
                            borderColor="blue.400"
                            size="md"
                            focusBorderColor="blue.500"
                            format={val => typeof val === 'number' ? val.toFixed(2) : val}
                          >
                            <NumberInputField fontWeight="bold" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontWeight="medium" color="gray.700">
                            수레-상자 마찰 계수
                          </FormLabel>
                          <NumberInput
                            value={cartBoxFriction}
                            onChange={(_, val) => handleCartBoxFrictionChange(val)}
                            step={0.01}
                            min={0}
                            max={1}
                            borderColor="purple.400"
                            size="md"
                            focusBorderColor="purple.500"
                            format={val => typeof val === 'number' ? val.toFixed(2) : val}
                          >
                            <NumberInputField fontWeight="bold" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontWeight="medium" color="gray.700">
                            수레 무게 (kg)
                          </FormLabel>
                          <NumberInput
                            value={cartWeight}
                            onChange={(_, val) => handleCartWeightChange(val)}
                            step={0.1}
                            min={0.1}
                            max={10}
                            borderColor="red.400"
                            size="md"
                            focusBorderColor="red.500"
                            format={val => typeof val === 'number' ? val.toFixed(1) : val}
                          >
                            <NumberInputField fontWeight="bold" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontWeight="medium" color="gray.700">
                            상자 무게 (kg)
                          </FormLabel>
                          <NumberInput
                            value={boxWeight}
                            onChange={(_, val) => handleBoxWeightChange(val)}
                            step={0.1}
                            min={0.1}
                            max={10}
                            borderColor="green.400"
                            size="md"
                            focusBorderColor="green.500"
                            format={val => typeof val === 'number' ? val.toFixed(1) : val}
                          >
                            <NumberInputField fontWeight="bold" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>
                      </VStack>
                    </Box>

                    <Box>
                      <Heading 
                        as="h3" 
                        size="md" 
                        mb={4} 
                        color="purple.600" 
                        borderBottom="2px solid" 
                        borderColor="purple.200" 
                        pb={2} 
                        fontSize="lg" 
                        fontWeight="bold"
                        display="flex"
                        alignItems="center"
                        gap={2}
                      >
                        <Box bg="purple.100" p={1.5} borderRadius="md">
                          <Icon as={FiZap} color="purple.700" boxSize="18px" />
                        </Box>
                        움직임 제어
                      </Heading>
                      <VStack align="stretch" gap={4} mt={3} px={1}>
                        <FormControl>
                          <FormLabel fontWeight="medium" color="gray.700">
                            최대 속력 (m/s)
                          </FormLabel>
                          <NumberInput
                            value={maxSpeed}
                            onChange={(_, val) => handleMaxSpeedChange(val)}
                            step={0.1}
                            min={0.1}
                            max={10}
                            borderColor="purple.400"
                            size="md"
                            focusBorderColor="purple.500"
                            format={val => typeof val === 'number' ? val.toFixed(1) : val}
                          >
                            <NumberInputField fontWeight="bold" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontWeight="medium" color="gray.700">
                            가속도 (m/s²)
                          </FormLabel>
                          <NumberInput
                            value={acceleration}
                            onChange={(_, val) => handleAccelerationChange(val)}
                            step={0.1}
                            min={0.1}
                            max={5}
                            borderColor="orange.400"
                            size="md"
                            focusBorderColor="orange.500"
                            format={val => typeof val === 'number' ? val.toFixed(1) : val}
                          >
                            <NumberInputField fontWeight="bold" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontWeight="medium" color="gray.700">
                            감속도 (m/s²)
                          </FormLabel>
                          <NumberInput
                            value={deceleration}
                            onChange={(_, val) => handleDecelerationChange(val)}
                            step={0.1}
                            min={0.1}
                            max={5}
                            borderColor="cyan.400"
                            size="md"
                            focusBorderColor="cyan.500"
                            format={val => typeof val === 'number' ? val.toFixed(1) : val}
                          >
                            <NumberInputField fontWeight="bold" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontWeight="medium" color="gray.700">
                            목표 거리 (m)
                          </FormLabel>
                          <NumberInput
                            value={distance}
                            onChange={(_, val) => handleDistanceChange(val)}
                            step={0.5}
                            min={1}
                            max={100}
                            borderColor="yellow.400"
                            size="md"
                            focusBorderColor="yellow.500"
                            format={val => typeof val === 'number' ? val.toFixed(1) : val}
                          >
                            <NumberInputField fontWeight="bold" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </FormControl>
                      </VStack>
                    </Box>
                  </VStack>
                )}
                
                {activeTab === 1 && (
                  selectedObject ? (
                    <VStack align="flex-start" gap={4}>
                      <Heading size="md" color={selectedObject.type === 'cart' ? "blue.600" : "red.600"} pb={2} borderBottom="2px solid" borderColor={selectedObject.type === 'cart' ? "blue.200" : "red.200"} w="100%" fontSize="2xl">
                        {selectedObject.type === 'cart' ? '🚗 수레' : '📦 상자'} 정보
                      </Heading>
                      
                      <Box bg="gray.50" p={4} borderRadius="md" w="100%" border="1px solid" borderColor="gray.200">
                        <VStack align="stretch" gap={3}>
                          <HStack>
                            <Text fontWeight="bold" minWidth="80px" color="gray.700" fontSize="lg">위치:</Text>
                            <Text fontSize="lg" color="gray.900">X: {selectedObject.position[0].toFixed(2)}, Y: {selectedObject.position[1].toFixed(2)}, Z: {selectedObject.position[2].toFixed(2)}</Text>
                          </HStack>
                          
                          <HStack mt={2}>
                            <Text fontWeight="bold" minWidth="80px" color="gray.700" fontSize="lg">속도:</Text>
                            <Text fontSize="lg" color="gray.900">X: {selectedObject.velocity[0].toFixed(2)}, Y: {selectedObject.velocity[1].toFixed(2)}, Z: {selectedObject.velocity[2].toFixed(2)}</Text>
                          </HStack>
                          
                          {selectedObject.dimensions && (
                            <HStack mt={2}>
                              <Text fontWeight="bold" minWidth="80px" color="gray.700" fontSize="lg">크기:</Text>
                              <Text fontSize="lg" color="gray.900">가로: {selectedObject.dimensions.width.toFixed(2)}, 높이: {selectedObject.dimensions.height.toFixed(2)}, 깊이: {selectedObject.dimensions.depth.toFixed(2)}</Text>
                            </HStack>
                          )}
                          
                          {selectedObject.mass && (
                            <HStack mt={2}>
                              <Text fontWeight="bold" minWidth="80px" color="gray.700" fontSize="lg">질량:</Text>
                              <Text fontSize="lg" color="gray.900">{selectedObject.mass.toFixed(2)} kg</Text>
                            </HStack>
                          )}
                          
                          {selectedObject.angularVelocity && (
                            <HStack mt={2}>
                              <Text fontWeight="bold" minWidth="80px" color="gray.700" fontSize="lg">각속도:</Text>
                              <Text fontSize="lg" color="gray.900">X: {selectedObject.angularVelocity[0].toFixed(2)}, Y: {selectedObject.angularVelocity[1].toFixed(2)}, Z: {selectedObject.angularVelocity[2].toFixed(2)}</Text>
                            </HStack>
                          )}
                        </VStack>
                      </Box>
                    </VStack>
                  ) : (
                    <VStack h="100%" justify="center" align="center" p={8}>
                      <Text fontSize="xl" fontWeight="medium" color="gray.500" textAlign="center">
                        물체를 선택하면 정보가 표시됩니다
                      </Text>
                      <Text fontSize="md" color="gray.400" textAlign="center" mt={2}>
                        시뮬레이션에서 수레나 상자를 클릭하세요
                      </Text>
                    </VStack>
                  )
                )}
              </Box>
            </VStack>
          </VStack>
        </Flex>
      </VStack>
    </ChakraProvider>
  )
}

export default App
