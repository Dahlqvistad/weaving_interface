import React, { useState } from 'react';
import NavBar from './NavBar';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Home';
import Settings from './Settings';
import Label from './Label';
import Spreadsheet from './Spreadsheet';

export default function App() {
    return (
        <Router>
            <div className="flex h-screen">
                <NavBar />
                <div className="flex-grow overflow-auto">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/label" element={<Label />} />
                        <Route path="/spreadsheet" element={<Spreadsheet />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}
