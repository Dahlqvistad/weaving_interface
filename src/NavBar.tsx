import React, { useState } from 'react';
import { Home, Settings, FileSpreadsheet } from 'lucide-react';

export default function NavBar(settings: { bar_width?: number }) {
    const [activeElement, setActiveElement] = useState('Home');

    const configuration = {
        bar_width: settings.bar_width || 60, // px
        item_width: 100, // % of bar_width
        item_height: 100, // % of bar_width
    };

    const styles = {
        width: `${
            (configuration.bar_width * configuration.item_width) / 100
        }px`,
        height: `${
            (configuration.bar_width * configuration.item_height) / 100
        }px`,
    };

    return (
        <div>
            <nav
                className="bg-vs-gray-500 relative top-0 left-0 text-theme-font-three h-screen flex flex-col justify-between items-center"
                style={{
                    width: `${configuration.bar_width}px`,
                }}
            >
                <div>
                    <a
                        href="#"
                        className="navbar-element relative group"
                        style={{
                            width: styles.width,
                            height: styles.height,
                        }}
                    >
                        {/* Simulate the ::before pseudo-element for the active element */}
                        <div
                            className={`navbar-element-active ${
                                activeElement === 'Home'
                                    ? 'bg-vs-gray-800'
                                    : 'bg-transparent'
                            }`}
                        ></div>

                        <Home
                            className={`navbar-element-icon ${
                                activeElement === 'Home'
                                    ? 'text-vs-gray-800'
                                    : 'text-vs-gray-600'
                            }`}
                        />
                    </a>

                    <a
                        href="#"
                        className="navbar-element relative group"
                        style={{
                            width: styles.width,
                            height: styles.height,
                        }}
                    >
                        {/* Simulate the ::before pseudo-element for the active element */}
                        <div
                            className={`navbar-element-active ${
                                activeElement === 'FileSpreadsheet'
                                    ? 'bg-vs-gray-800'
                                    : 'bg-transparent'
                            }`}
                        ></div>

                        <FileSpreadsheet
                            className={`navbar-element-icon ${
                                activeElement === 'FileSpreadsheet'
                                    ? 'text-vs-gray-800'
                                    : 'text-vs-gray-600'
                            }`}
                        />
                    </a>
                </div>
                <div>
                    <a
                        href="#"
                        className="navbar-element relative group"
                        style={{
                            width: styles.width,
                            height: styles.height,
                        }}
                    >
                        <div
                            className={`navbar-element-active ${
                                activeElement === 'Settings'
                                    ? 'bg-vs-gray-800'
                                    : 'bg-transparent'
                            }`}
                        ></div>

                        <Settings
                            className={`navbar-element-icon ${
                                activeElement === 'Settings'
                                    ? 'text-vs-gray-800'
                                    : 'text-vs-gray-600'
                            }`}
                        />
                    </a>
                </div>
            </nav>
        </div>
    );
}
