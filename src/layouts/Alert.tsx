import React, { useEffect } from 'react';

interface AlertComponentProps {
    text: string;
    color?: string;
    show: boolean;
    onClose?: () => void;
    duration?: number; // milliseconds
}

const AlertComponent: React.FC<AlertComponentProps> = ({
    color = '#343841',
    text,
    // show,
    // onClose,
    // duration = 3000,
}) => {
    // useEffect(() => {
    //     if (show && onClose) {
    //         const timer = setTimeout(onClose, duration);
    //         return () => clearTimeout(timer);
    //     }
    // }, [show, onClose, duration]);

    // if (!show) return null;

    return (
        <div
            className="fixed right-3 bottom-3 max-w-[20vw] p-1 z-50 flex flex-col rounded-md"
            style={{
                backgroundColor: color,
                boxShadow: 'rgba(0, 0, 0, 0.36) 0px 0px 8px 2px',
            }}
        >
            <div className="">
                <div className="flex flex-row items-center justify-between pl-3">
                    <h1 className="text-md text-theme-font-one">Alert</h1>
                    <div className="ml-4 px-2 py-1 bg-gray-200 rounded">X</div>
                </div>
                <div>
                    <p className="p-3 pt-0 text-theme-font-three">{text}</p>
                </div>
            </div>
        </div>
    );
};

export default AlertComponent;
