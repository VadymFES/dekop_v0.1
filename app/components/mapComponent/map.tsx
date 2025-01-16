import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import styles from './map.module.css';
import Image from 'next/image';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
});

import { LatLngTuple } from 'leaflet';

const position: LatLngTuple = [50.872776851121195, 26.484908133484204];

const Map: React.FC = React.memo(() => {
  Map.displayName = "Map";
  return (
    <section className={styles.bodyMap}>
      <div className={styles.mapWrapper}>
        <div className={styles.infoContainer}>
          <Image 
          src="/logomain.png" 
          alt="Logo" 
          className={styles.logo}
          width={200}
          height={110}
           />
          <div className={styles.contactInfo}>
            <h4 className={styles.address}>
              <Image src="/address.png" alt="Address" className={styles.icon} width={20} height={20} />
              об’їзна м. Костопіль, с. мала Любаша вул. Кленова 1, м. Костопіль, Рівненська область, Україна, 35000
            </h4>
            <p>
              <Image src="/phone.png" alt="Phone" className={styles.icon} width={20} height={20} />
              +380982208569
            </p>
            <p>
              <Image src="/email.png" alt="Email" className={styles.icon} width={20} height={20}/>
              <a href="mailto:dekop.enterprise@gmail.com">dekop.enterprise@gmail.com</a>
            </p>
            <p>
              <Image src="/facebook.png" alt="Facebook" className={styles.icon} width={20} height={20}/>
              <a href="https://facebook.com/MebliDecor" target="_blank" rel="noopener noreferrer">facebook.com/MebliDecor</a>
            </p>
            <div className={styles.socialLinks}>
              <a href="https://viber.com/" target="_blank" rel="noopener noreferrer" className={styles.socialButton}>
                <Image src="/viber.png" alt="Viber" className={styles.socialIcon} width={20} height={20}/>
                Viber
              </a>
              <a href="https://telegram.org/" target="_blank" rel="noopener noreferrer" className={styles.socialButton}>
                <Image src="/telegram.png" alt="Telegram" className={styles.socialIcon}width={20} height={20} />
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
    </section>
  );
});

export default Map;
