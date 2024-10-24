import React, { useState } from "react";
import styles from "./materialsMain.module.css";

const materials = [
    { id: 1, image: "https://fullhouse.uz/d/vidy_ldsp.jpg", type: "Material 1", description: "High-quality material suitable for various applications. This material is known for its exceptional durability and versatility, making it a top choice for a wide range of projects. It can be used in both indoor and outdoor settings, providing reliable performance in different environments. Its resistance to wear and tear ensures that it maintains its integrity over time, even under heavy use. Additionally, this material is easy to work with, allowing for efficient installation and maintenance." },
    { id: 2, image: "https://fullhouse.uz/d/vidy_ldsp.jpg", type: "Material 2", description: "Durable and reliable material, perfect for construction. It offers excellent resistance to wear and tear, ensuring long-lasting performance in demanding environments. This material is particularly well-suited for structural applications, where strength and stability are paramount. Its robust nature makes it ideal for use in foundations, frameworks, and other critical components of buildings and infrastructure. Furthermore, it is designed to withstand harsh weather conditions, making it a dependable choice for outdoor projects." },
    { id: 3, image: "https://fullhouse.uz/d/vidy_ldsp.jpg", type: "Material 3", description: "Eco-friendly material with excellent performance. This material is designed to minimize environmental impact while providing superior quality and functionality. It is made from sustainable resources and manufactured using processes that reduce carbon footprint. Despite its eco-friendly nature, it does not compromise on performance, offering the same level of durability and reliability as traditional materials. It is ideal for projects that prioritize sustainability without sacrificing quality." },
    { id: 4, image: "https://fullhouse.uz/d/vidy_ldsp.jpg", type: "Material 4", description: "Lightweight material ideal for modern designs. Its lightweight nature allows for easy handling and installation, making it a favorite among designers and builders. This material is perfect for applications where weight is a critical factor, such as in the construction of portable structures or in areas where load-bearing capacity is limited. Despite its light weight, it offers impressive strength and stability, ensuring that it can support various design requirements without compromising on safety or performance." },
    { id: 5, image: "https://fullhouse.uz/d/vidy_ldsp.jpg", type: "Material 5", description: "Cost-effective material with versatile uses. This material offers great value for money, making it an economical choice for a variety of applications. It is suitable for both residential and commercial projects, providing reliable performance at a lower cost. Its versatility allows it to be used in a wide range of settings, from interior finishes to exterior cladding. Additionally, it is easy to work with, reducing labor costs and installation time, further enhancing its cost-effectiveness." },
    { id: 6, image: "https://fullhouse.uz/d/vidy_ldsp.jpg", type: "Material 6", description: "Premium material known for its strength and durability. It is highly regarded for its robust construction and ability to withstand extreme conditions. This material is ideal for high-stress applications, where maximum performance is required. It is resistant to impact, abrasion, and other forms of damage, ensuring that it maintains its integrity over time. Its premium quality makes it a preferred choice for critical projects that demand the highest standards of reliability and durability." },
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