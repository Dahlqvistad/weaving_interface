import React, { useState, useEffect } from 'react';
import mill_1 from '../images/loom-animate-1.svg';
import mill_2 from '../images/loom-animate-2.svg';
import pencil from '../images/pencil.svg';

interface InfoCardProps {
    machineId: number;
    className?: string;
    dragHandleProps?: any;
}
interface MachineData {
    id: number;
    name: string;
    status: number;
    skott_idag: number;
    uptime: number;
    downtime: number;
    fabric_id?: number;
    skott_fabric: number;
    ip: string;
}

export default function InfoCard({
    machineId,
    className = '',
    dragHandleProps,
}: InfoCardProps) {
    const [machine, setMachine] = useState<MachineData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Debug: log dragHandleProps after all hooks, before any conditional returns
    // React.useEffect(() => {
    //     if (dragHandleProps == null) {
    //         console.warn(
    //             'InfoCard: dragHandleProps is null/undefined for machineId',
    //             machineId
    //         );
    //     } else {
    //         console.log(
    //             'InfoCard: dragHandleProps for machineId',
    //             machineId,
    //             dragHandleProps
    //         );
    //     }
    // }, [dragHandleProps, machineId]);

    useEffect(() => {
        const loadMachine = async () => {
            try {
                const machineData = await window.dbAPI.machine.getById(
                    machineId
                );
                setMachine(machineData);
                setLoading(false);
            } catch (error) {
                console.error('Error loading machine:', error);
                setLoading(false);
            }
        };

        loadMachine();

        // WebSocket connection for real-time updates
        const ws = new WebSocket('ws://192.168.88.118:8081');

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (
                message.type === 'machine_update' &&
                message.data.id === machineId
            ) {
                setMachine(message.data);
            }
        };

        return () => ws.close();
    }, [machineId]);

    // Animation effect - only runs when machine is active (status 1)
    useEffect(() => {
        if (!machine || machine.status !== 1) return;

        const animationInterval = setInterval(() => {
            setCurrentFrame((prev) => (prev === 0 ? 1 : 0));
        }, 1000); // Switch every 1000ms for smooth animation

        return () => clearInterval(animationInterval);
    }, [machine?.status]);

    // Reset to frame 0 when machine is not actively producing
    useEffect(() => {
        if (machine && machine.status !== 1) {
            setCurrentFrame(0);
        }
    }, [machine?.status]);

    // Helper function to get status colors and text
    const getStatusInfo = (status: number) => {
        switch (status) {
            case 0:
                return {
                    bgColor: 'bg-status-0',
                    text: '🔴 Inaktiv',
                    color: 'red',
                };
            case 1:
                return {
                    bgColor: 'bg-status-1',
                    text: '🟢 Aktiv',
                    color: 'green',
                };
            case 2:
                return {
                    bgColor: 'bg-status-2',
                    text: '⚫ Offline',
                    color: 'gray',
                };
            case 3:
                return {
                    bgColor: 'bg-status-3',
                    text: '🟠 Klar',
                    color: 'orange',
                };
            default:
                return {
                    bgColor: 'bg-gray-100',
                    text: '❓ Okänd',
                    color: 'gray',
                };
        }
    };

    // Handle edit name functionality
    const handleEditClick = () => {
        if (machine && !isUpdating) {
            setEditName(machine.name);
            setIsEditing(true);
        }
    };

    const handleNameSubmit = async () => {
        if (!machine || !editName.trim() || isUpdating) return;

        setIsUpdating(true);
        try {
            const response = await fetch(
                `http://192.168.88.118:8080/api/machines/${machine.id}/name`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: editName.trim() }),
                }
            );

            if (response.ok) {
                // Update local state immediately for better UX
                setMachine((prev) =>
                    prev ? { ...prev, name: editName.trim() } : null
                );
                setIsEditing(false);
            } else {
                const error = await response.json();
                console.error('Failed to update machine name:', error);
                alert('Failed to update machine name. Please try again.');
            }
        } catch (error) {
            console.error('Error updating machine name:', error);
            alert('Failed to update machine name. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleNameSubmit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditName('');
        }
    };

    const handleBlur = () => {
        if (!isUpdating) {
            setIsEditing(false);
            setEditName('');
        }
    };

    if (loading) {
        return (
            <div
                className={`relative bg-theme-background-three border border-theme-background-five rounded-lg animate-pulse ${className}`}
            >
                {/* Drag handle flush at the top edge, outside padding */}
                <div className="absolute left-0 top-0 w-full h-[24px] flex justify-center z-10">
                    <div
                        className="cursor-grab flex items-center justify-center rounded-t-md shadow-sm w-full h-[24px] select-none"
                        {...(dragHandleProps ? dragHandleProps : {})}
                        tabIndex={0}
                        role="button"
                        aria-label="Drag handle"
                    ></div>
                </div>
                {/* <div className="p-4 pt-6">
                    <div className="h-4 bg-theme-background-five rounded mb-2"></div>
                    <div className="h-8 bg-theme-background-five rounded mb-1"></div>
                    <div className="h-3 bg-theme-background-five rounded w-3/4"></div>
                </div> */}
            </div>
        );
    }

    if (!machine) {
        return (
            <div
                className={`relative bg-theme-background-three border border-theme-background-five rounded-lg ${className}`}
            >
                {/* Drag handle flush at the top edge, outside padding */}
                <div className="absolute left-0 top-0 w-full h-[24px] flex justify-center z-10">
                    <div
                        className="cursor-grab flex items-center justify-center bg-vs-gray-500 rounded-t-md shadow-sm w-full h-[24px] select-none"
                        {...(dragHandleProps ? dragHandleProps : {})}
                        tabIndex={0}
                        role="button"
                        aria-label="Drag handle"
                    ></div>
                </div>
                <div className="p-4 pt-6">
                    <p className="text-theme-font-three">Machine not found</p>
                </div>
            </div>
        );
    }

    // Choose which image to show based on machine status and animation frame
    const currentImage =
        machine.status === 1 ? (currentFrame === 0 ? mill_1 : mill_2) : mill_1;

    const statusInfo = getStatusInfo(machine.status);

    return (
        <div
            className={`relative bg-theme-background-three border border-theme-background-five rounded-lg ${className}`}
        >
            {/* Drag handle flush at the top edge, outside padding */}
            <div className="absolute left-0 top-0 w-full h-[24px] flex justify-center z-10">
                <div
                    className="cursor-grab flex items-center justify-center rounded-t-md shadow-sm w-full h-[24px] select-none"
                    {...(dragHandleProps ? dragHandleProps : {})}
                    tabIndex={0}
                    role="button"
                    aria-label="Drag handle"
                ></div>
            </div>
            {/* Main padded content below the handle */}
            <div className="p-4 pt-6">
                <div
                    className={`flex flex-col items-center mb-4 ${statusInfo.bgColor}`}
                >
                    <img
                        src={currentImage}
                        alt={machine.name}
                        className="w-[350px] h-[190px] mb-2 transition-opacity duration-200"
                    />
                    <div className="py-1 px-2 bg-vs-gray-500 rounded-md mb-1 flex flex-row justify-center items-center gap-3">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={handleKeyPress}
                                onBlur={handleBlur}
                                className="text-theme-font-three text-sm font-medium bg-transparent border-b border-theme-font-three outline-none min-w-0 text-center"
                                autoFocus
                                disabled={isUpdating}
                                style={{
                                    width: `${Math.max(
                                        editName.length * 8,
                                        80
                                    )}px`,
                                }}
                            />
                        ) : (
                            <h3 className="text-theme-font-three text-sm font-medium">
                                {machine.name}
                            </h3>
                        )}
                        <div
                            className={`cursor-pointer hover:opacity-80 ${
                                isUpdating
                                    ? 'opacity-50 cursor-not-allowed'
                                    : ''
                            }`}
                            onClick={!isUpdating ? handleEditClick : undefined}
                        >
                            <img src={pencil} alt="Edit" className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                <p className="text-theme-font-one text-2xl font-bold">
                    {machine.skott_idag}st
                </p>
                <p className="text-theme-font-three text-xs mt-1">
                    Status: {statusInfo.text} | Drift:{' '}
                    {Math.round(
                        (machine.uptime / (machine.uptime + machine.downtime)) *
                            100
                    ) || 0}
                    %
                </p>
            </div>
        </div>
    );
}
