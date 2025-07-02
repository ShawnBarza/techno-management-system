import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export const DeviceStatus = {
  ON: 'on',
  OFF: 'off'
} as const;

export const subscribeToDevice = (deviceId: string, callback: (status: string) => void) => {
  const deviceDoc = doc(db, 'devices', deviceId);
  return onSnapshot(deviceDoc, (doc) => {
    if (doc.exists()) {
      callback(doc.data()?.power || DeviceStatus.OFF);
    } else {
      callback(DeviceStatus.OFF);
    }
  });
};

export const toggleDevice = async (deviceId: string, status: string) => {
  const deviceDoc = doc(db, 'devices', deviceId);
  await setDoc(deviceDoc, { power: status }, { merge: true });
};
