import styles from './partners.module.css';
import Image from 'next/image';

export default function Partners() {
  const partners = [
    { src: '/logo_22.png', alt: 'Partner 22', width: 90, height: 80 },
    { src: '/logo_33.png', alt: 'Partner 33', width: 150, height: 70 },
    { src: '/logo_alta.png', alt: 'Alta Partner', width: 150, height: 70 },
    { src: '/logo_artex.png', alt: 'Artex Partner', width: 150, height: 70 },
    { src: '/logo_busol.svg', alt: 'Busol Partner', width: 150, height: 40 },
    { src: '/logo_divotex.png', alt: 'Divotex Partner', width: 150, height: 30 },
    { src: '/logo_etera.png', alt: 'Etera Partner', width: 150, height: 100 },
    { src: '/logo_pulsar.png', alt: 'Pulsar Partner', width: 150, height: 100 },
    { src: '/Logo_Swisspan.png', alt: 'Swisspan Partner', width: 140, height: 90 },
    { src: '/mebtex_logo.png', alt: 'Mebtex Partner', width: 150, height: 100 },
    { src: '/megatex_logo.png', alt: 'Megatex Partner', width: 150, height: 70 },
    { src: '/textoria_logo.svg', alt: 'Textoria Partner', width: 150, height: 100 },
  ];

  return (
    <div className={styles.partnersBckg}>
      <div className={styles.partnersContainer}>
        <div className={styles.partners}>
          {partners.map((partner, index) => (
            <Image
              key={index}
              src={partner.src}
              alt={partner.alt}
              className={styles.partner}
              width={partner.width}
              height={partner.height}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
