// Example of a HomePage component in Home.tsx
import React, { useState, useEffect } from 'react';
import InfoCard from './InfoCard';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function Home() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [machines, setMachines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Helper to reorder array
    const reorder = (list: any[], startIndex: number, endIndex: number) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    // Handle drag end
    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        setMachines((prev) =>
            reorder(prev, result.source.index, result.destination.index)
        );
    };

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
        <div className="p-6 ">
            <h1 className="text-[70px] flex justify-center font-bold text-theme-font-one mb-8">
                {currentTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </h1>

            {loading ? (
                <div>Loading machines...</div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="machineGrid" direction="horizontal">
                        {(provided: any) => (
                            <div
                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                {machines
                                    .filter(
                                        (machine) =>
                                            machine && machine.id != null
                                    )
                                    .map((machine, index) => (
                                        <Draggable
                                            key={machine.id}
                                            draggableId={machine.id.toString()}
                                            index={index}
                                        >
                                            {(dragProvided: any) => (
                                                <div
                                                    ref={dragProvided.innerRef}
                                                    {...dragProvided.draggableProps}
                                                >
                                                    <InfoCard
                                                        machineId={machine.id}
                                                        dragHandleProps={
                                                            dragProvided.dragHandleProps
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}

            {/* Other content */}
        </div>
    );
}
