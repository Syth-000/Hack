import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Image, Platform , View, Text} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';

import { Camera } from 'expo-camera';

export default function TabTwoScreen() {

  const [hasPermission, setHasPermission] = useState(null);
  const [model, setModel] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      // Request camera permission
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      // Ensure TensorFlow is ready
  await tf.ready();

  panel
    const URL = "https://teachablemachine.withgoogle.com/models/DpUtnaiyW/";

        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

model = await tf.load(modelURL, metadataURL);
     //   maxPredictions = model.getTotalClasses();


  // // Load the model.json asset
  // const modelJsonAsset = Asset.fromModule(require('../../assets/model/model.json'));
  // await modelJsonAsset.downloadAsync();

  // // Load the weights.bin asset
  // const modelWeightsAsset = Asset.fromModule(require('../../assets/model/weights.bin'));
  // await modelWeightsAsset.downloadAsync();

  // // Get the local URI paths
  // const modelJsonUri = modelJsonAsset.localUri || modelJsonAsset.uri;
  // const modelWeightsUri = modelWeightsAsset.localUri || modelWeightsAsset.uri;

  // // Load the model using the URIs
  // const model = await tf.loadGraphModel(
  //   bundleResourceIO(modelJsonUri, modelWeightsUri)
  //);

  setModel(model);
    })();
  }, []);

  const handleCapture = async () => {
    if (cameraRef.current && model) {
      const photo = await cameraRef.current.takePictureAsync({
        skipProcessing: true,
      });
      const imgB64 = photo.base64;
      const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer;
      const raw = new Uint8Array(imgBuffer);
      const imageTensor = decodeJpeg(raw);

      // Preprocess the image if required by your model
      // For example, resize, normalize, etc.

      const prediction = await model.predict(imageTensor);
      setPredictions(prediction);
    }
  };

  if (hasPermission === null) {
    return <View><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View><Text>Camera permission denied.</Text></View>;
  }


  return (
    <View style={styles.container}>
      <Camera style={styles.camera} ref={cameraRef} />
      <Button title="Capture" onPress={handleCapture} />
      {predictions.length > 0 && (
        <View style={styles.predictions}>
          {predictions.map((p, index) => (
            <Text key={index}>{p.className}: {p.probability.toFixed(2)}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  predictions: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
