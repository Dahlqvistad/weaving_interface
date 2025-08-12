// Example of a HomePage component in Home.tsx
import React, { useState, useEffect } from 'react';
import InfoCard from './InfoCard/InfoCard';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import AlertComponent from '../Global/Alert';
// import { ReactComponent as grid_4x4 } from '../images/grid-4x4.svg';

export default function Home() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [machines, setMachines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [gridCols, setGridCols] = useState(2);

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

    const gridColClass = {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
    }[gridCols];
    return (
        <div className="p-6 ">
            <div className="relative w-full mb-8 h-[100px]">
                <h1 className="absolute left-1/2 top-0 transform -translate-x-1/2 text-[70px] font-bold text-theme-font-one">
                    {currentTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </h1>
                <div className="absolute right-0 top-0 flex flex-col items-end">
                    <div className="relative flex gap-2 z-50">
                        <div
                            onClick={() => {
                                setGridCols(1);
                            }}
                            className="group rounded shadow cursor-pointer"
                            title="1x1 grid"
                        >
                            <svg
                                className={`w-12 h-12 hover:stroke-vs-gray-800 ${
                                    gridColClass === 'grid-cols-1'
                                        ? 'stroke-vs-gray-800'
                                        : ''
                                }`}
                                xmlns="http://www.w3.org/2000/svg"
                                id="Outline"
                                viewBox="0 0 32 32"
                                width="512"
                                height="512"
                                stroke="#757980"
                            >
                                <rect
                                    x="1"
                                    y="1"
                                    width="30"
                                    height="30"
                                    rx="2"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                            </svg>
                        </div>
                        <div
                            onClick={() => {
                                setGridCols(2);
                            }}
                            className="group rounded shadow cursor-pointer"
                            title="2x2 grid"
                        >
                            <svg
                                className={`w-12 h-12 hover:stroke-vs-gray-800 ${
                                    gridColClass === 'grid-cols-2'
                                        ? 'stroke-vs-gray-800'
                                        : ''
                                }`}
                                xmlns="http://www.w3.org/2000/svg"
                                id="Outline"
                                viewBox="0 0 32 32"
                                width="512"
                                height="512"
                                stroke="#757980"
                            >
                                <rect
                                    x="1"
                                    y="1"
                                    width="13"
                                    height="13"
                                    rx="2"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="18"
                                    y="1"
                                    width="13"
                                    height="13"
                                    rx="2"
                                    fill="none"
                                    strokeWidth="1.5"
                                />

                                <rect
                                    x="1"
                                    y="18"
                                    width="13"
                                    height="13"
                                    rx="2"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="18"
                                    y="18"
                                    width="13"
                                    height="13"
                                    rx="2"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                            </svg>
                        </div>
                        <div
                            onClick={() => {
                                setGridCols(3);
                            }}
                            className="group rounded shadow cursor-pointer"
                            title="4x4 grid"
                        >
                            <svg
                                className={`w-12 h-12 hover:stroke-vs-gray-800 ${
                                    gridColClass === 'grid-cols-3'
                                        ? 'stroke-vs-gray-800'
                                        : ''
                                }`}
                                xmlns="http://www.w3.org/2000/svg"
                                id="Outline"
                                viewBox="0 0 32 32"
                                width="512"
                                height="512"
                                stroke="#757980"
                            >
                                <rect
                                    x="1"
                                    y="1"
                                    width="7.1670"
                                    height="7.1670"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="12.167"
                                    y="1"
                                    width="7.1670"
                                    height="7.1670"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="23.334"
                                    y="1"
                                    width="7.1670"
                                    height="7.1670"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />

                                <rect
                                    x="1"
                                    y="12.167"
                                    width="7.1670"
                                    height="7.1670"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="12.167"
                                    y="12.167"
                                    width="7.1670"
                                    height="7.1670"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="23.334"
                                    y="12.167"
                                    width="7.1670"
                                    height="7.1670"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />

                                <rect
                                    x="1"
                                    y="23.334"
                                    width="7.1670"
                                    height="7.1670"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="12.167"
                                    y="23.334"
                                    width="7.1670"
                                    height="7.1670"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="23.334"
                                    y="23.334"
                                    width="7.1670"
                                    height="7.1670"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                            </svg>
                        </div>
                        <div
                            onClick={() => {
                                setGridCols(4);
                            }}
                            className="group rounded shadow cursor-pointer"
                            title="4x4 grid"
                        >
                            <svg
                                className={`w-12 h-12 hover:stroke-vs-gray-800 ${
                                    gridColClass === 'grid-cols-4'
                                        ? 'stroke-vs-gray-800'
                                        : ''
                                }`}
                                xmlns="http://www.w3.org/2000/svg"
                                id="Outline"
                                viewBox="0 0 32 32"
                                width="512"
                                height="512"
                                stroke="#757980"
                            >
                                <rect
                                    x="1"
                                    y="1"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="9"
                                    y="1"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="17"
                                    y="1"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="25"
                                    y="1"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />

                                <rect
                                    x="1"
                                    y="9"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="9"
                                    y="9"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="17"
                                    y="9"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="25"
                                    y="9"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />

                                <rect
                                    x="1"
                                    y="17"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="9"
                                    y="17"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="17"
                                    y="17"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="25"
                                    y="17"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />

                                <rect
                                    x="1"
                                    y="25"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="9"
                                    y="25"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="17"
                                    y="25"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x="25"
                                    y="25"
                                    width="5"
                                    height="5"
                                    rx="1.5"
                                    fill="none"
                                    strokeWidth="1.5"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div>Loading machines...</div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="machineGrid" direction="horizontal">
                        {(provided: any) => (
                            <div
                                className={`grid ${gridColClass} gap-4`}
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

            {/* <AlertComponent text="This is an alert message!" /> */}
        </div>
    );
}
