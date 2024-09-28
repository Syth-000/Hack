import React, { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import * as posedetection from '@tensorflow-models/pose-detection';
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system';

const TensorCamera = cameraWithTensors(Camera);

const PoseEstimation = () => {

  const [facing, setFacing] = useState<CameraType>('back');

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [predictions, setPredictions] = useState<string[]>([]);
  const modelRef = useRef<tf.LayersModel | null>(null);
  const detectorRef = useRef<posedetection.PoseDetector | null>(null);
  const rafId = useRef<number | null>(null);
  const classNamesRef = useRef<string[] | null>(null);

  const init = async () => {
    await tf.ready();

    // Load the pose detector model
    detectorRef.current = await posedetection.createDetector(
      posedetection.SupportedModels.MoveNet,
      {
        modelType: posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      }
    );

    // Load the Teachable Machine classification model and metadata
    const modelBaseUrl = 'https://your-model-url/'; // Replace with your model URL
    const modelJsonUrl = `${modelBaseUrl}model.json`;
    const modelDir = `${FileSystem.cacheDirectory}model/`;

    const downloadModel = async () => {
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });

      // Download model.json
      const modelJsonPath = `${modelDir}model.json`;
      await FileSystem.downloadAsync(modelJsonUrl, modelJsonPath);

      // Parse model.json to get weights manifest
      const modelJson = await FileSystem.readAsStringAsync(modelJsonPath);
      const modelJsonObj = JSON.parse(modelJson);
      const weightsManifest = modelJsonObj.weightsManifest;
      const weightPaths = weightsManifest[0].paths;

      // Download the weight files
      for (const weightPath of weightPaths) {
        const weightUrl = `${modelBaseUrl}${weightPath}`;
        const weightFilePath = `${modelDir}${weightPath}`;
        await FileSystem.downloadAsync(weightUrl, weightFilePath);
      }

      // Download metadata.json
      const metadataUrl = `${modelBaseUrl}metadata.json`;
      const metadataPath = `${modelDir}metadata.json`;
      await FileSystem.downloadAsync(metadataUrl, metadataPath);

      // Read class names from metadata.json
      const metadataJson = await FileSystem.readAsStringAsync(metadataPath);
      const metadataObj = JSON.parse(metadataJson);
      classNamesRef.current = metadataObj.labels;

      return modelJsonPath;
    };

    const modelJsonPath = await downloadModel();
    modelRef.current = await tf.loadLayersModel(`file://${modelJsonPath}`);
  };

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      await init();
    })();

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  const handleCameraStream = (
    images: IterableIterator<tf.Tensor3D>,
    updatePreview: () => void,
    gl: WebGLRenderingContext
  ) => {
    const loop = async () => {
      const imageTensor = images.next().value;

      if (detectorRef.current && modelRef.current && imageTensor) {
        const poses = await detectorRef.current.estimatePoses(imageTensor);

        if (poses && poses.length > 0) {
          const keypoints = poses[0].keypoints;

          // Prepare input for the classification model
          const input = keypoints
            .map((keypoint) => [keypoint.x, keypoint.y])
            .flat();
          const inputTensor = tf.tensor([input]);

          // Get predictions
          const prediction = await modelRef.current.predict(inputTensor) as tf.Tensor;
          const predictionData = prediction.dataSync();

          // Find the class with the highest probability
          const maxIndex = predictionData.indexOf(Math.max(...predictionData));

          setPredictions([
            `${classNamesRef.current![maxIndex]}: ${predictionData[maxIndex].toFixed(2)}`,
          ]);

          tf.dispose([inputTensor, prediction]);
        }

        tf.dispose(imageTensor);
      }

      rafId.current = requestAnimationFrame(loop);
    };

    loop();
  };

  if (hasPermission === null) {
    return (
      <View>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View>
        <Text>No access to camera</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TensorCamera
        style={{ flex: 1 }}
        type={facing}
        // Adjust texture dimensions and resize options as needed
        cameraTextureHeight={1920}
        cameraTextureWidth={1080}
        resizeHeight={192}
        resizeWidth={192}
        resizeDepth={3}
        onReady={handleCameraStream}
        autorender={false}
      />
      <View>
        {predictions.map((p, index) => (
          <Text key={index}>{p}</Text>
        ))}
      </View>
    </View>
  );
};

export default PoseEstimation;
