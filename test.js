const { PrismaClient } = require('./src/generated/prisma/client');
const prisma = new PrismaClient();
async function main() {
    console.log('Starting Prisma script');
    const occ = await prisma.occupation.findFirst();
    const comp = await prisma.company.findFirst();
    try {
        await prisma.job.create({
            data: {
                title: 'Test',
                description: 'Desc',
                occupationId: occ.id,
                workingShift: 'FULL_DAY',
                quantity: 1,
                companyId: comp.id,
                status: 'WARNING',
                applyForms: {
                    create: {
                        fields: {
                            create: [{ label: '111', fieldType: 'textarea', isRequired: false }]
                        }
                    }
                }
            }
        });
        console.log('\n\n\nSuccess');
    } catch (e) {
        console.log('\n\n\nPRISMA ERROR:\n', e.message);
    }
}
main().catch(console.error).finally(() => prisma['$disconnect']());
