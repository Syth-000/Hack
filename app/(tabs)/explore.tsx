import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Image, Platform, View, Text, Button, TouchableOpacity } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';

import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';


export default function TabTwoScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  let [model, setModel] = useState(tf.GraphModel<string | any >);
  const [predictions, setPredictions] = useState([]);



  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  useEffect(() => {
    (async () => {
      // Ensure TensorFlow is ready
      await tf.ready();

      const URL = "https://teachablemachine.withgoogle.com/models/DpUtnaiyW/";

      const modelURL = URL + "model.json";
      const metadataURL = URL + "metadata.json";

       // Load the model using the URIs
       const model = await ts.loadGraphModel(modelURL, metadataURL);

      setModel(model);
    })();
  }, []);

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }


  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Flip Camera</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});
