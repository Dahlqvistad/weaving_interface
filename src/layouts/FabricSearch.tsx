import React, { useState, useEffect } from 'react';

interface Fabric {
    article_number: string | number;
    name: string;
    color?: string;
    width?: string | number;
}

interface FabricSearchProps {
    open: boolean;
    onClose: () => void;
    onSelect: (fabric: Fabric) => void;
}

export default function FabricSearch({
    open,
    onClose,
    onSelect,
}: FabricSearchProps) {
    const [fabricSearch, setFabricSearch] = useState('');
    const [fabricList, setFabricList] = useState<Fabric[]>([]);
    const [fabricLoading, setFabricLoading] = useState(false);
    const [selectedFabric, setSelectedFabric] = useState<Fabric | null>(null);

    useEffect(() => {
        if (!open) return;
        setFabricLoading(true);
        fetch('/data/parsed_metervara.json')
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setFabricList(data);
                } else {
                    setFabricList([]);
                }
                setFabricLoading(false);
            })
            .catch(() => {
                setFabricList([]);
                setFabricLoading(false);
            });
    }, [open]);

    const filteredFabrics = fabricList
        .filter((fabric) => {
            if (!fabricSearch) return false;
            const search = fabricSearch.toLowerCase();
            return (
                (fabric.name && fabric.name.toLowerCase().includes(search)) ||
                (fabric.color && fabric.color.toLowerCase().includes(search)) ||
                (fabric.article_number &&
                    String(fabric.article_number).includes(search))
            );
        })
        .slice(0, 20);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-vs-gray-500 rounded-lg shadow-lg p-6 w-[400px] relative">
                <button
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                    onClick={() => {
                        setFabricSearch('');
                        setSelectedFabric(null);
                        onClose();
                    }}
                >
                    ✕
                </button>
                <h2 className="text-lg text-theme-font-one font-bold mb-2">
                    Byt tyg
                </h2>
                <input
                    type="text"
                    className="w-full border rounded px-2 py-1 mb-2"
                    placeholder="Sök efter namn, färg eller artikelnummer..."
                    value={fabricSearch}
                    onChange={(e) => {
                        setFabricSearch(e.target.value);
                        setSelectedFabric(null);
                    }}
                    autoFocus
                />
                {fabricLoading ? (
                    <div>Laddar...</div>
                ) : (
                    <ul className="max-h-60 overflow-y-auto border rounded">
                        {filteredFabrics.length === 0 && fabricSearch && (
                            <li className="p-2 text-gray-400">
                                Ingen matchning
                            </li>
                        )}
                        {filteredFabrics.map((fabric) => (
                            <li
                                key={fabric.article_number}
                                className={`p-2 cursor-pointer hover:bg-vs-gray-200 text-theme-font-two ${
                                    selectedFabric?.article_number ===
                                    fabric.article_number
                                        ? 'bg-vs-gray-300'
                                        : ''
                                }`}
                                onClick={() => setSelectedFabric(fabric)}
                            >
                                <div className="font-semibold">
                                    {fabric.name}
                                </div>
                                <div className="text-xs text-gray-600">
                                    Art.nr: {fabric.article_number} | Color:{' '}
                                    {fabric.color} | Width: {fabric.width}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {selectedFabric && (
                    <button
                        className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                        onClick={() => {
                            onSelect(selectedFabric);
                            setFabricSearch('');
                            setSelectedFabric(null);
                        }}
                    >
                        Byt till {selectedFabric.name}
                    </button>
                )}
            </div>
        </div>
    );
}
