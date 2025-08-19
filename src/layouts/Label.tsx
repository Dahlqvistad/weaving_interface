import React, { useRef } from 'react';
import StatsSection from './Statistics/demo';

const Label: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // For now, just log the file name
            console.log('Selected XLSX file:', file.name);
            // You can add XLSX parsing logic here later
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <StatsSection />
            <label htmlFor="xlsx-upload">Upload XLSX file:</label>
            <input
                id="xlsx-upload"
                type="file"
                accept=".xlsx"
                ref={fileInputRef}
                onChange={handleFileChange}
            />
        </div>
    );
};

export default Label;
