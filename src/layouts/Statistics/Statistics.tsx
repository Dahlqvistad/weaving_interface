import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Brush,
    ReferenceArea,
} from 'recharts';
import StatsSection from './demo';

export type DateRange = '7d' | '30d' | 'custom';
export type ValueTimespan = 'hour' | 'day' | 'week';
export type SumMode = 'combined' | 'byMachine' | 'byFabric';

export interface Filters {
    startDate?: string;
    endDate?: string;
    machineId?: string;
    fabricId?: string;
}

const PALETTE = {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
};

const StatisticsComponent = () => {
    const [filters, setFilters] = useState<Filters>({});
    const [dateRange, setDateRange] = useState<DateRange>('7d');
    const [sumMode, setSumMode] = useState<SumMode>('combined');

    return (
        <div>
            <h1>Statistics</h1>

            <div className="flex flex-row gap-2 mx-4">Hello</div>
        </div>
    );
};

const DatePresets = () => {
    return <></>;
};

export default StatisticsComponent;
