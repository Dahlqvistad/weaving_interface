// Example of a HomePage component in Home.tsx
import React, { useState, useEffect } from 'react';
import InfoCard from './InfoCard';

export default function Home() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [machines, setMachines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadMachines = async () => {
            try {
                const machineData = await window.dbAPI.machine.getAll();
                setMachines(machineData);
                setLoading(false);
            } catch (error) {
                console.error('Error loading machines:', error);
                setLoading(false);
            }
        };

        loadMachines();
    }, []);
    return (
        <div className="p-6">
            <h1 className="text-[70px] flex justify-center font-bold text-theme-font-one mb-8">
                {currentTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </h1>

            {loading ? (
                <div>Loading machines...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2  gap-4">
                    {machines.map((machine) => (
                        <InfoCard key={machine.id} machineId={machine.id} />
                    ))}
                </div>
            )}

            {/* Other content */}
        </div>
    );
}
