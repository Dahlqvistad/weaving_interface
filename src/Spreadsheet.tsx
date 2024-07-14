// Example of a HomePage component in HomePage.tsx
import React, { useState, useRef } from 'react';
import 'handsontable/dist/handsontable.full.min.css';
import Handsontable from 'handsontable/base';
import { registerAllModules } from 'handsontable/registry';
import { HotTable } from '@handsontable/react';

registerAllModules();

export default function Spreadsheet() {
    const [dataFilerWidth, setDataFilerWidth] = useState(180); // Initial width in pixels
    const resizerRef = useRef(null);

    const startResizing = (mouseDownEvent: any) => {
        const startX = mouseDownEvent.clientX;
        const startWidth = dataFilerWidth;

        const doResize = (mouseMoveEvent: any) => {
            const currentX = mouseMoveEvent.clientX;
            const newWidth = startWidth + (currentX - startX);
            setDataFilerWidth(newWidth);
        };

        const stopResizing = () => {
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResizing);
        };

        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResizing);
    };
    return (
        <div>
            <div className="flex h-screen">
                <div
                    style={{ width: `${dataFilerWidth}px` }}
                    className=" h-screen sticky top-0 bg-theme-background-two resize-x overflow-auto"
                >
                    <div className="bg-theme-background-five">
                        <p className="text-theme-font-two text-[12px] pl-2 p-1">
                            DATAFILER
                        </p>
                    </div>
                </div>
                <div
                    ref={resizerRef}
                    onMouseDown={startResizing}
                    onDragStart={(event) => event.preventDefault()}
                    className="w-[8px] cursor-col-resize bg-transparent hover:bg-vs-blue-200"
                ></div>
                <div className="w-full bg-theme-background-seven overflow-auto relative">
                    <HotTable
                        data={[
                            ['', 'Tesla', 'Volvo', 'Toyota', 'Ford'],
                            ['2019', 10, 11, 12, 13],
                            ['2020', 20, 11, 14, 13],
                            ['2021', 30, 15, 12, 13],
                            ['2019', 10, 11, 12, 13],
                            ['2020', 20, 11, 14, 13],
                            ['2021', 30, 15, 12, 13],
                        ]}
                        rowHeaders={true}
                        colHeaders={true}
                        dropdownMenu={true}
                        readOnly={true}
                        autoColumnSize={true}
                        height="auto"
                        licenseKey="non-commercial-and-evaluation" // for non-commercial use only
                    />
                </div>
            </div>
        </div>
    );
}
