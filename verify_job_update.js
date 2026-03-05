const { PrismaClient } = require('./src/generated/prisma/client');
const prisma = new PrismaClient();

async function checkJob() {
    try {
        const job = await prisma.job.findFirst({
            include: {
                applyForms: {
                    include: { fields: true }
                }
            }
        });
        if (!job) {
            console.log("No job found");
            return;
        }

        console.log("Updating job ID:", job.id);
        const dto = {
            title: job.title + " updated",
            fields: job.applyForms?.[0]?.fields?.map(f => ({
                id: f.id,
                label: f.label,
                fieldType: f.fieldType,
                isRequired: f.isRequired,
                options: f.options
            })) || []
        };

        // Simulating the updateJobFull
        const txResult = await prisma.$transaction(async (tx) => {
            const { fields, ...jobData } = dto;
            await tx.job.update({ where: { id: job.id }, data: jobData });

            const form = await tx.jobApplyForm.findFirst({ where: { jobId: job.id }, include: { fields: true } });
            if (!form) throw new Error("Form not found");

            console.log("Form found:", form.id);
            for (const field of fields) {
                if (field.id) {
                    await tx.jobApplyFormField.update({
                        where: { id: field.id },
                        data: { label: field.label, fieldType: field.fieldType, isRequired: field.isRequired, options: field.options }
                    });
                } else {
                    await tx.jobApplyFormField.create({
                        data: { formId: form.id, label: field.label, fieldType: field.fieldType, isRequired: field.isRequired, options: field.options }
                    });
                }
            }
            return tx.job.findUnique({ where: { id: job.id } });
        });

        console.log("Update SUCCESS", txResult.id);
    } catch (e) {
        console.error("Update ERROR:", e);
    } finally {
        await prisma.$disconnect();
    }
}
checkJob();
