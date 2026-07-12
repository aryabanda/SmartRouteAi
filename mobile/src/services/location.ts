import Geolocation from 'react-native-geolocation-service';
import {PermissionsAndroid, Platform} from 'react-native';

export async function requestLocationPermission() {

    if (Platform.OS === 'android') {

        const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
        title: "Location Permission",
        message: "Smart Route AI needs your location to provide navigation and safety features.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
    }
);

        return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
}


export async function getCurrentLocation(): Promise<any> {

  console.log("getCurrentLocation called");

  const permission = await requestLocationPermission();
  console.log("Permission:", permission);

  if (!permission) {
    throw new Error("Location permission denied");
  }

  return new Promise((resolve, reject) => {
    console.log("Calling getCurrentPosition...");
    Geolocation.getCurrentPosition(
      position => {
        console.log("SUCCESS");
        console.log(JSON.stringify(position, null, 2));
        resolve(position);
      },
      error => {
        console.log("ERROR");
        console.log("Code:", error.code);
        console.log("Message:", error.message);
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60000,
        forceLocationManager: false,
        showLocationDialog: true,
      },
    );
  });
}


export async function watchLocation(
  onLocation: (position: any) => void,
) {
  const permission = await requestLocationPermission();

  if (!permission) {
    throw new Error('Location permission denied');
  }

  const watchId = Geolocation.watchPosition(
    position => {
      console.log('LIVE GPS', position.coords);

      onLocation(position);
    },
    error => {
      console.log(error);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 1,
      interval: 1000,
      fastestInterval: 1000,
      forceLocationManager: true,
      showLocationDialog: true,
    },
  );

  return watchId;
}

export function stopWatchingLocation(watchId: number) {
  Geolocation.clearWatch(watchId);
}