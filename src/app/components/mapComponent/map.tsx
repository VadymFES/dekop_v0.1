import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import styles from './map.module.css';

// Adjust the marker icon if needed
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet/dist/images/marker-icon.png',
  iconSize: [25, 41], // size of the icon
  iconAnchor: [12, 41], // point of the icon which will correspond to marker's location
  popupAnchor: [1, -34], // point from which the popup should open relative to the iconAnchor
  shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
  shadowSize: [41, 41], // size of the shadow
});

const Map: React.FC = () => {
  const position: [number, number] = [50.872776851121195, 26.484908133484204]; // Your coordinates

  return (
    <div className={styles.mapWrapper}>
      <div className={styles.infoContainer}>
        <img src="/logoDecor.png" alt="Logo" className={styles.logo} />
        <div className={styles.contactInfo}>
          <h4 className={styles.address}>
            <img src="/address.png" alt="Address" className={styles.icon} />
            об’їзна м. Костопіль, с. мала Любаша вул. Кленова 1, м. Костопіль, Рівненська область, Україна, 35000
          </h4>
          <p>
            <img src="/phone.png" alt="Phone" className={styles.icon} />
            +380982208569
          </p>
          <p>
            <img src="/email.png" alt="Email" className={styles.icon} />
           <a href="mailto:dekop.enterprise@gmail.com"> dekop.enterprise@gmail.com</a>
          </p>
            <p>
            <img src="/facebook.png" alt="Facebook" className={styles.icon} />
            <a href="facebook.com/MebliDecor" target="_blank" rel="noopener noreferrer">facebook.com/MebliDecor</a>
            </p>
            <div className={styles.socialLinks}>
  <a href="https://viber.com/" target="_blank" rel="noopener noreferrer" className={styles.socialButton}>
    <img src="/viber.png" alt="Viber" className={styles.socialIcon} />
    Viber
  </a>
  <a href="https://telegram.org/" target="_blank" rel="noopener noreferrer" className={styles.socialButton}>
    <img src="/telegram.png" alt="Telegram" className={styles.socialIcon} />
    Telegram
  </a>
</div>
        </div>
      </div>
      <MapContainer center={position} zoom={13} className={styles.mapContainer}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={position} icon={DefaultIcon}>
          <Popup>
          Dekop Furniture Enterprise - меблі для вашого дому
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default Map;
