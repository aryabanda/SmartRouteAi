import React from 'react';
import MapView, { Marker, UrlTile } from 'react-native-maps';

type Props = {
  latitude: number;
  longitude: number;
};

export default function OSMMap({ latitude, longitude }: Props) {
  return (
    <MapView
      style={{ flex: 1, borderRadius: 20 }}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <UrlTile
        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
      />

      <Marker
        coordinate={{ latitude, longitude }}
        title="You"
        description="Current Location"
      />
    </MapView>
  );
}