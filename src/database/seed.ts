import { MachineModel } from './models/Machine';
import { MachineRawModel } from './models/MachineRaw';

export const seedMachines = async () => {
    try {
        // Check if machines already exist
        console.log(new Date().toISOString(), 'Seeding machines...');
        const existingMachines = await MachineModel.getAll();

        if (existingMachines.length > 0) {
            console.log(
                `Database already has ${existingMachines.length} machines. Skipping seed.`
            );
            return;
        }

        console.log('Database is empty. Adding initial machines...');

        const testMachines = [
            {
                name: 'Maskin 1',
                ip: '192.168.1.101',
                status: 1, // 1 = active, 0 = inactive
                skott_idag: 0,
                driftstatus: 100,
            },
            {
                name: 'Maskin 2',
                ip: '192.168.1.102',
                status: 1,
                skott_idag: 0,
                driftstatus: 100,
            },
            {
                name: 'Maskin 3',
                ip: '192.168.1.103',
                status: 0,
                skott_idag: 0,
                driftstatus: 0,
            },
            {
                name: 'Maskin 4',
                ip: '192.168.1.104',
                status: 0,
                skott_idag: 0,
                driftstatus: 0,
            },
        ];

        for (const machine of testMachines) {
            try {
                await MachineModel.create(machine);
                console.log(`Created machine: ${machine.name}`);
            } catch (error) {
                console.log(`Error creating machine ${machine.name}:`, error);
            }
        }

        console.log('Database seeding completed!');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
};

export const seedMachineRawData = async () => {
    try {
        // Check if machine raw data already exists
        const existingRawData = await MachineRawModel.getAll();

        if (existingRawData.length > 0) {
            console.log(
                `Database already has ${existingRawData.length} machine raw data entries. Skipping seed.`
            );
            return;
        }

        console.log('Database is empty. Adding initial machine raw data...');

        const testRawData = [
            {
                machine_id: 1,
                timestamp: '2025-08-05T09:34:27.667Z',
                event_type: 'skott',
                value: 100,
            },
            {
                machine_id: 2,
                timestamp: '2025-08-05T09:34:28.667Z',
                event_type: 'skott',
                value: 200,
            },
            {
                machine_id: 3,
                timestamp: '2025-08-05T09:34:29.667Z',
                event_type: 'avbrott',
                value: 0,
            },
            {
                machine_id: 4,
                timestamp: '2025-08-05T09:34:30.667Z',
                event_type: 'avbrott',
                value: 0,
            },
            {
                machine_id: 1,
                timestamp: '2025-08-05T09:34:37.667Z',
                event_type: 'skott',
                value: 34,
            },
            {
                machine_id: 2,
                timestamp: '2025-08-05T09:34:38.667Z',
                event_type: 'skott',
                value: 200,
            },
            {
                machine_id: 3,
                timestamp: '2025-08-05T09:34:39.667Z',
                event_type: 'avbrott',
                value: 0,
            },
            {
                machine_id: 4,
                timestamp: '2025-08-05T09:34:40.667Z',
                event_type: 'avbrott',
                value: 0,
            },
        ];

        for (const rawData of testRawData) {
            try {
                await MachineRawModel.create(rawData);
                console.log(
                    `Created machine raw data for machine ID: ${rawData.machine_id}`
                );
            } catch (error) {
                console.log(
                    `Error creating machine raw data for machine ID ${rawData.machine_id}:`,
                    error
                );
            }
        }

        console.log('Machine raw data seeding completed!');
    } catch (error) {
        console.error('Error seeding machine raw data:', error);
    }
};

export const seedFabrics = async () => {
    try {
        // Check if fabrics already exist
        const { FabricModel } = await import('./models/Fabric');
        const existingFabrics = await FabricModel.getAll();

        if (existingFabrics.length > 0) {
            console.log(
                `Database already has ${existingFabrics.length} fabrics. Skipping fabric seed.`
            );
            return;
        }

        console.log('Database is empty. Adding initial fabrics...');

        const testFabrics = [
            {
                name: 'Skåne metervara bredd 150',
                pattern: 'skåne',
                width: 150,
                skott_per_meter: 1300,
                colors: {
                    vit: 3634, // VIT - white
                    stålgrå: 3633, // SGR - steel gray
                    sand: 3632, // SND - sand
                    plommon: 3631, // PLO - plum
                    natur: 3630, // NAT - natural
                    ljusgrön: 3629, // LGÖ - light green
                    ljusblå: 3628, // LBL - light blue
                    linne: 3627, // LNE - linen
                },
            },
        ];

        for (const fabric of testFabrics) {
            try {
                await FabricModel.create(fabric);
                console.log(`Created fabric: ${fabric.name}`);
            } catch (error) {
                console.log(`Error creating fabric ${fabric.name}:`, error);
            }
        }

        console.log('Fabric seeding completed!');
    } catch (error) {
        console.error('Error seeding fabrics:', error);
    }
};
