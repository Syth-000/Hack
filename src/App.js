import React, { useState, useEffect , useRef} from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Timer, List } from 'lucide-react'


const FocusButton = ({ onToggle, isActive }) => (
  <button
    onClick={onToggle}
    className={`font-bold py-4 px-8 rounded-full text-xl shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
      isActive
        ? "bg-gray-500 hover:bg-gray-600 text-white"
        : "bg-amber-700 hover:bg-amber-800 text-white"
    }`}
    >
    {isActive ? "Stop Focus" : "Start Focus"}
  </button>
);

const FocusTimer = ({ time, isWarning }) => (
  <motion.div
    initial={{ opacity: 0, y: -50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -50 }}
    className={`text-4xl font-bold mb-8 ${
      isWarning ? 'text-red-600 animate-pulse' : 'text-amber-800'
    }`}
  >
    {new Date(time * 1000).toISOString().substr(11, 8)}
  </motion.div>
);



const Scoreboard = ({ scores, isActive, isWarning }) => (
  <div className="bg-amber-50 p-6 rounded-lg shadow-md">
    <h2 className="text-2xl font-bold mb-4 text-amber-800">Scoreboard</h2>
    <ul>
      {scores.map((score, index) => (
        <li key={index} className="mb-2 text-amber-700">
          {new Date(score * 1000).toISOString().substr(11, 8)}
        </li>
      ))}
    </ul>
  </div>
);

// camera not working error message
const ErrorMessage = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: -50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -50 }}
    className="text-red-600 font-bold mt-4"
  >
    {message}
  </motion.div>
);

const Home = ({ onToggle, time, isActive, webcamError}) => (
  <div className="flex flex-col items-center justify-center h-screen bg-amber-100">
    <AnimatePresence>
      {isActive && <FocusTimer time={time} />}
    </AnimatePresence>
    <FocusButton onToggle={onToggle} isActive={isActive} />

    {isActive && ( 
    <div className="mt-8 relative">
      <div><canvas id="canvas"></canvas></div>
      <div id="label-container"></div>
    </div>
    )}

    <AnimatePresence>
        {webcamError && isActive && <ErrorMessage message="Camera not working" />}
      </AnimatePresence>

</div>
);

const App = () => {
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [scores, setScores] = useState([]);
  const [focusValue, setFocusValue] = useState(1);
  const [webcamError, setWebcamError] = useState(false);
  const [unfocusedTime, setUnfocusedTime] = useState(0);
  const [isWarning, setIsWarning] = useState(false);
  const focusTimeoutIdRef = useRef(null);
  const unfocusedStartTimeRef = useRef(null);


  const URL = "https://teachablemachine.withgoogle.com/models/DpUtnaiyW/";

  let model, webcam, ctx, labelContainer, maxPredictions;

  useEffect(() => {
    // Load TensorFlow.js and Teachable Machine Pose libraries
    const loadScripts = async () => {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js');
    };
    loadScripts();
  }, []);

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const init = async () => {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        // load the model and metadata
        // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
        // Note: the pose library adds a tmPose object to your window (window.tmPose)
        model = await window.tmPose.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Convenience function to setup a webcam
        const size = 200;
        const flip = true; // whether to flip the webcam
        webcam = new window.tmPose.Webcam(size, size, flip); // width, height, flip
        
        const canvas = document.getElementById("canvas");
        canvas.width = size; canvas.height = size;

        // display empty canves if camera doesnt work
        try{

        await webcam.setup(); // request access to the webcam
        await webcam.play();
        window.requestAnimationFrame(loop);

        // append/get elements to the DOM
        
        ctx = canvas.getContext("2d");
        labelContainer = document.getElementById("label-container");
        for (let i = 0; i < maxPredictions; i++) { // and class labels
            labelContainer.appendChild(document.createElement("div"));
        }
        setWebcamError(false);
      }catch(e){
        ctx = canvas.getContext("2d");
        ctx.fillStyle = "#D1D5DB";  // A light gray color
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setWebcamError(true);
      }
    }

    async function loop(timestamp) {
      webcam.update();
      await predict();
      window.requestAnimationFrame(loop);
    }
  
    async function predict() {
      const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
      const prediction = await model.predict(posenetOutput);
  
      for (let i = 0; i < maxPredictions; i++) {
        const classPrediction =
          prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        labelContainer.childNodes[i].innerHTML = classPrediction;
      }
  
      if (prediction[1].probability >= 0.7) {
        if (!unfocusedStartTimeRef.current) {
          unfocusedStartTimeRef.current = Date.now();
        }
        const currentUnfocusedTime = Math.floor((Date.now() - unfocusedStartTimeRef.current) / 1000);
        setUnfocusedTime(currentUnfocusedTime);
  
        if (currentUnfocusedTime >= 20 && currentUnfocusedTime < 30) {
          console.log("Warning: You've been unfocused for 20 seconds");
          setIsWarning(true);
        } else if (currentUnfocusedTime >= 30) {
          console.log("You've been unfocused for 30 seconds. Resetting focus value.");
          setFocusValue(0);
          setIsActive(false);
          saveScore();
        }
      } else {
        console.log("You're focused!");
        unfocusedStartTimeRef.current = null;
        setUnfocusedTime(0);
        setIsWarning(false);
      }
  
      drawPose(pose);
    }
  
    function drawPose(pose) {
      if (webcam.canvas) {
        ctx.drawImage(webcam.canvas, 0, 0);
        if (pose) {
          const minPartConfidence = 0.5;
          window.tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
          window.tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
        }
      }
    }
  
    useEffect(() => {
      let interval = null;
      if (isActive && focusValue > 0) {
        interval = setInterval(() => {
          setTime((time) => time + 1);
        }, 1000);
      } else if (!isActive && time !== 0) {
        clearInterval(interval);
        saveScore();
        setTime(0);
      }
      return () => clearInterval(interval);
    }, [isActive, time, focusValue]);
  
    const toggleFocus = () => {
      if (isActive) {
        setIsActive(false);
        setTime(0);
        if (webcam) {
          webcam.stop();
        }
      } else {
        setIsActive(true);
        setFocusValue(1);
        init();
      }
    };
  
   
  const saveScore = () => {
    const endTime = new Date().toLocaleTimeString();
    const newScore = { time, endTime };
    
    // Read existing scores from local storage
    const existingScores = JSON.parse(localStorage.getItem('focusScores') || '[]');
    
    // Add new score and sort
    const updatedScores = [...existingScores, newScore].sort((a, b) => b.time - a.time);
    
    // Save updated scores back to local storage
    localStorage.setItem('focusScores', JSON.stringify(updatedScores));
    
    console.log('Saved scores to local storage:', updatedScores);
  };
  
    return (
      <Router>
        <div className="font-sans">
          <nav className="bg-amber-200 p-4">
            <ul className="flex justify-center space-x-4">
              <li>
                <Link to="/" className="text-amber-800 hover:text-amber-900 flex items-center">
                  <Timer className="mr-1" /> Home
                </Link>
              </li>
              <li>
                <Link to="/scoreboard" className="text-amber-800 hover:text-amber-900 flex items-center">
                  <List className="mr-1" /> Scoreboard
                </Link>
              </li>
            </ul>
          </nav>
  
          <Routes>
            <Route 
              path="/" 
              element={
                <Home 
                  onToggle={toggleFocus} 
                  time={time} 
                  isActive={isActive} 
                  webcamError={webcamError}
                  isWarning={isWarning}
                />
              } 
            />
            <Route path="/scoreboard" element={<Scoreboard scores={scores} />} />
          </Routes>
        </div>
      </Router>
    );
  };
  
  export default App;