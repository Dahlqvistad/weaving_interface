import React, { useState } from 'react';
import NavBar from './Global/NavBar';
import {
    BrowserRouter as Router,
    Route,
    Routes,
    Navigate,
} from 'react-router-dom';
import Home from './Home/Home';
import Settings from './Settings/Settings';
import Label from './Label';
import Statistics from './Statistics/Statistics';

export default function App() {
    return (
        <Router>
            <div className="flex h-screen">
                <NavBar />
                <div className="flex-grow overflow-auto bg-theme-background-four">
                    <Routes>
                        <Route path="*" element={<Navigate to="/" />} />
                        <Route path="/" element={<Home />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/label" element={<Label />} />
                        <Route path="/statistics" element={<Statistics />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}
