// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBOLz5b02fmsgVga1EqaV-x5UHI2i6N8mA",
  authDomain: "powermate-management.firebaseapp.com",
  projectId: "powermate-management",
  storageBucket: "powermate-management.firebasestorage.app",
  messagingSenderId: "768452762216",
  appId: "1:768452762216:web:12d03dd5dd8bc3e14b79dd",
  measurementId: "G-BHRZQKY3WV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);