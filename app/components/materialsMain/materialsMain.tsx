import React, { useState } from "react";
import styles from "./materialsMain.module.css";

const materials = [
    { id: 1, image: "https://fullhouse.uz/d/vidy_ldsp.jpg", type: "ДСП", description: "Renowned for its unmatched durability and resilience, this premium material excels in challenging environments. Its robust construction ensures peak performance in high-stress scenarios, making it ideal for demanding applications. Resistant to wear, impact, and harsh conditions, it retains its quality and integrity over time. Its exceptional reliability makes it the preferred choice for projects requiring uncompromising standards of performance and durability" },
    { id: 2, image: "https://fullhouse.uz/d/vidy_ldsp.jpg", type: "ЛДСП", description: "A top-tier material celebrated for its exceptional strength and toughness, designed to thrive under extreme conditions. Its superior craftsmanship ensures reliable performance in critical applications. With excellent resistance to impact, abrasion, and wear, it delivers lasting quality and functionality. Chosen for its dependability, it’s the go-to solution for projects demanding premium performance and long-term durability" },
    { id: 3, image: "https://fullhouse.uz/d/vidy_ldsp.jpg", type: "МДФ", description: "This high-performance material is praised for its unparalleled durability and robust design, perfectly suited for the most demanding environments. Built to endure high-pressure situations, it resists impact, abrasion, and other forms of damage. Its superior reliability and quality make it a trusted choice for applications requiring exceptional strength and long-lasting performance" },
    { id: 4, image: "https://fullhouse.uz/d/vidy_ldsp.jpg", type: "ЕКОШКІРА", description: "Known for its exceptional strength and endurance, this premium material is engineered for extreme conditions and high-stress applications. Its superior resilience ensures lasting integrity, even in challenging environments. Impact and abrasion-resistant, it delivers consistent performance, making it the ideal choice for projects where reliability and durability are paramount" },
    { id: 5, image: "https://fullhouse.uz/d/vidy_ldsp.jpg", type: "ВЕЛЮР", description: "A premium-grade material famed for its exceptional toughness and reliability, offering unparalleled performance in demanding conditions. Designed to withstand impact, abrasion, and heavy wear, it maintains its structural integrity over time. Its superior quality ensures it is the preferred choice for critical applications requiring maximum strength and durability" },
    { id: 6, image: "https://fullhouse.uz/d/vidy_ldsp.jpg", type: "ТЕКСТИЛЬ", description: "" },
];

const MaterialsMain = () => {
    const [selectedType, setSelectedType] = useState(materials[0].type);  // Initialize with the first material type

    const handleTypeClick = (type: React.SetStateAction<string>) => {
        setSelectedType(type);  // Set the selected type when button is clicked
    };

    const filteredMaterial = materials.find((material) => material.type === selectedType);  // Find the selected material

    return (
        <div className={styles.materialsMainContainer}>
            {/* Material types at the top */}
            <div className={styles.materialTypes}>
                {materials.map((material) => (
                    <button
                        key={material.id}
                        onClick={() => handleTypeClick(material.type)}  // Set the type when clicked
                        className={`${styles.materialTypeButton} ${selectedType === material.type ? styles.active : ""}`}
                    >
                        {material.type}
                    </button>
                ))}
            </div>

            {/* Show only the selected material */}
            {filteredMaterial && (
                <div className={styles.materialCard}>
                    <div className={styles.materialInfo}>
                        <h3 className={styles.materialTitle}>{filteredMaterial.type}</h3>
                        <p className={styles.materialDescription}>{filteredMaterial.description}</p>
                    </div>
                    <div className={styles.materialImageWrapper}>
                        <img src={filteredMaterial.image} alt={filteredMaterial.type} className={styles.materialImage} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaterialsMain;