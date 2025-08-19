import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Settings, FileSpreadsheet, Tag, LineChart } from 'lucide-react';

export default function NavBar(settings: { bar_width?: number }) {
    const configuration = {
        bar_width: settings.bar_width || 60, // px
        item_width: 100, // % of bar_width
        item_height: 100, // % of bar_width
    };
    let activePage = useLocation().pathname;

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
                    {/* Home */}
                    <Link
                        to="/"
                        className="navbar-element relative group"
                        style={{
                            width: styles.width,
                            height: styles.height,
                        }}
                    >
                        {/* Simulate the ::before pseudo-element for the active element */}
                        <div
                            className={`navbar-element-active ${
                                activePage === '/'
                                    ? 'bg-vs-gray-800'
                                    : 'bg-transparent'
                            }`}
                        ></div>

                        <Home
                            className={`navbar-element-icon ${
                                activePage === '/'
                                    ? 'text-vs-gray-800'
                                    : 'text-vs-gray-600'
                            }`}
                        />
                    </Link>

                    {/* Tag */}
                    <Link
                        to="/label"
                        className="navbar-element relative group"
                        style={{
                            width: styles.width,
                            height: styles.height,
                        }}
                    >
                        {/* Simulate the ::before pseudo-element for the active element */}
                        <div
                            className={`navbar-element-active ${
                                activePage === '/label'
                                    ? 'bg-vs-gray-800'
                                    : 'bg-transparent'
                            }`}
                        ></div>

                        <Tag
                            className={`navbar-element-icon ${
                                activePage === '/label'
                                    ? 'text-vs-gray-800'
                                    : 'text-vs-gray-600'
                            }`}
                        />
                    </Link>

                    {/* Statistics */}
                    <Link
                        to={'/statistics'}
                        className="navbar-element relative group"
                        style={{
                            width: styles.width,
                            height: styles.height,
                        }}
                    >
                        <div
                            className={`navbar-element-active ${
                                activePage === '/statistics'
                                    ? 'bg-vs-gray-800'
                                    : 'bg-transparent'
                            }`}
                        ></div>

                        <LineChart
                            className={`navbar-element-icon ${
                                activePage === '/statistics'
                                    ? 'text-vs-gray-800'
                                    : 'text-vs-gray-600'
                            }`}
                        />
                    </Link>
                </div>

                <div>
                    {/* Settings */}
                    <Link
                        to={'/settings'}
                        className="navbar-element relative group"
                        style={{
                            width: styles.width,
                            height: styles.height,
                        }}
                    >
                        <div
                            className={`navbar-element-active ${
                                activePage === '/settings'
                                    ? 'bg-vs-gray-800'
                                    : 'bg-transparent'
                            }`}
                        ></div>

                        <Settings
                            className={`navbar-element-icon ${
                                activePage === '/settings'
                                    ? 'text-vs-gray-800'
                                    : 'text-vs-gray-600'
                            }`}
                        />
                    </Link>
                </div>
            </nav>
        </div>
    );
}
