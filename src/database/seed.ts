import { MachineModel } from './models/Machine';

export const seedMachines = async () => {
    try {
        // Check if machines already exist
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
                meter_idag: 0,
                driftstatus: 100,
            },
            {
                name: 'Maskin 2',
                ip: '192.168.1.102',
                status: 1,
                meter_idag: 0,
                driftstatus: 100,
            },
            {
                name: 'Maskin 3',
                ip: '192.168.1.103',
                status: 0,
                meter_idag: 0,
                driftstatus: 0,
            },
            {
                name: 'Maskin 4',
                ip: '192.168.1.104',
                status: 0,
                meter_idag: 0,
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
