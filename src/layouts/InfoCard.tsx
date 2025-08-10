import React, { useState, useEffect } from 'react';
import FabricSearch from './FabricSearch';
import mill_1 from '../images/loom-animate-1.svg';
import mill_2 from '../images/loom-animate-2.svg';
import pencil from '../images/pencil.svg';

// Import types and helper
// Restore local types and helper
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
    meter_idag: number;
    uptime: number;
    downtime: number;
    fabric_id?: number;
    skott_fabric: number;
    ip: string;
}

// Helper component to fetch and display fabric name from fabric_id
function FabricName({
    fabricId,
    skottFabric,
}: {
    fabricId: number;
    skottFabric: number;
}) {
    const [fabricLabel, setFabricLabel] = useState<string | null>(null);
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (
                    window.dbAPI &&
                    window.dbAPI.fabric &&
                    window.dbAPI.fabric.getName
                ) {
                    const label = await window.dbAPI.fabric.getName(fabricId);
                    if (mounted) {
                        setFabricLabel(label);
                    }
                } else {
                    setFabricLabel(null);
                }
            } catch {
                setFabricLabel(null);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [fabricId]);
    return `${fabricLabel ?? fabricId}`;
}

// ...existing code...

export default function InfoCard({
    machineId,
    className = '',
    dragHandleProps,
}: InfoCardProps) {
    // Fabric search modal state
    const [showFabricModal, setShowFabricModal] = useState(false);
    const [machine, setMachine] = useState<MachineData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentFrame, setCurrentFrame] = useState(0);

    // Animation effect for mill images
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (machine && machine.status === 1) {
            interval = setInterval(() => {
                setCurrentFrame((prev) => (prev === 0 ? 1 : 0));
            }, 500);
        } else {
            setCurrentFrame(0); // Always show mill_1 when not active
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [machine?.status]);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        let ws: WebSocket | null = null;
        let mounted = true;
        const loadMachine = async () => {
            try {
                const machineData = await window.dbAPI.machine.getById(
                    machineId
                );
                if (mounted) {
                    setMachine(machineData);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error loading machine:', error);
                if (mounted) setLoading(false);
            }
        };
        loadMachine();

        // Subscribe to WebSocket updates for this machine
        ws = new WebSocket('ws://192.168.88.118:8081');
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (
                    message.type === 'machine_update' &&
                    message.data.id === machineId
                ) {
                    setMachine(message.data);
                }
            } catch (err) {
                // Ignore parse errors
            }
        };
        return () => {
            mounted = false;
            if (ws) ws.close();
        };
    }, [machineId]);

    // State for skott_per_meter
    const [skottPerMeter, setSkottPerMeter] = useState<number | null>(null);

    useEffect(() => {
        let mounted = true;
        async function fetchSkottPerMeter() {
            if (
                machine?.fabric_id &&
                window.dbAPI?.fabric?.getByArticleNumber
            ) {
                try {
                    const fabric = await window.dbAPI.fabric.getByArticleNumber(
                        machine.fabric_id
                    );
                    if (mounted && fabric && fabric.skott_per_meter) {
                        setSkottPerMeter(fabric.skott_per_meter);
                    } else if (mounted) {
                        setSkottPerMeter(null);
                    }
                } catch (error) {
                    if (mounted) setSkottPerMeter(null);
                }
            } else if (mounted) {
                setSkottPerMeter(null);
            }
        }
        fetchSkottPerMeter();
        return () => {
            mounted = false;
        };
    }, [machine?.fabric_id]);

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
                    <div className="py-1 pr-2 pl-4 bg-vs-gray-500 rounded-md mb-1 flex flex-row justify-center items-center gap-3">
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
                        {/* Change Fabric Button */}
                        {/* <button
                            className="ml-2 p-1 rounded hover:bg-vs-gray-600 border border-theme-background-five"
                            onClick={() => setShowFabricModal(true)}
                        >
                            Byt tyg
                        </button> */}
                        {/* Fabric Search Modal */}
                        <FabricSearch
                            open={showFabricModal}
                            onClose={() => setShowFabricModal(false)}
                            onSelect={async (fabric) => {
                                setShowFabricModal(false);
                                try {
                                    const res = await fetch(
                                        `http://192.168.88.118:8080/api/machines/${machine.id}/fabric`,
                                        {
                                            method: 'PUT',
                                            headers: {
                                                'Content-Type':
                                                    'application/json',
                                            },
                                            body: JSON.stringify({
                                                article_number:
                                                    fabric.article_number,
                                            }),
                                        }
                                    );
                                    if (!res.ok) {
                                        alert('Failed to change fabric');
                                    }
                                } catch {
                                    alert('Failed to change fabric');
                                }
                            }}
                        />
                    </div>
                </div>

                <p className="text-theme-font-one text-2xl font-bold ml-2">
                    {skottPerMeter
                        ? `${(machine.skott_fabric / skottPerMeter).toFixed(
                              2
                          )} m`
                        : '...'}
                </p>
                <p
                    className="text-theme-font-two text-xs mt-1 p-1 pl-2 rounded-md hover:bg-vs-gray-600 hover:cursor-pointer"
                    onClick={() => setShowFabricModal(true)}
                >
                    {machine.fabric_id ? (
                        <FabricName
                            fabricId={machine.fabric_id}
                            skottFabric={machine.skott_fabric}
                        />
                    ) : (
                        'Inget tyg valt'
                    )}
                </p>
                <p className="text-theme-font-three text-xs mt-1 ml-2">
                    Status: {statusInfo.text} | Drift:{' '}
                    {Math.round(
                        (machine.uptime / (machine.uptime + machine.downtime)) *
                            100
                    ) || 0}
                    % | Meter vävda idag: {(machine.meter_idag ?? 0).toFixed(2)}{' '}
                    m
                </p>
            </div>
        </div>
    );
}
