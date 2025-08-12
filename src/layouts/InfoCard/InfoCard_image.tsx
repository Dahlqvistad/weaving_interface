import React, { useState, useEffect } from 'react';
import mill_1 from '../../images/loom-animate-1.svg';
import mill_2 from '../../images/loom-animate-2.svg';

interface ImageInfoCardProps {
    status: number;
}

const ImageInfoCard: React.FC<ImageInfoCardProps> = ({ status }) => {
    const [currentFrame, setCurrentFrame] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (status === 1) {
            interval = setInterval(() => {
                setCurrentFrame((prev) => (prev === 0 ? 1 : 0));
            }, 500);
        } else {
            setCurrentFrame(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status]);

    const currentImage =
        status === 1 ? (currentFrame === 0 ? mill_1 : mill_2) : mill_1;

    return (
        <div>
            <img
                src={currentImage}
                className="w-[350px] h-[190px] mb-2 transition-opacity duration-200"
            />
        </div>
    );
};

export default ImageInfoCard;
