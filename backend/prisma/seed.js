import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const initialComponents = [
  'Dasar Hukum',
  'Persyaratan Pelayanan',
  'Sistem, Mekanisme, dan Prosedur',
  'Jangka Waktu Pelayanan',
  'Biaya/Tarif',
  'Produk Pelayanan',
  'Sarana, Prasarana dan/atau Fasilitas',
  'Kompetensi Pelaksana',
  'Pengawasan Internal',
  'Pengelolaan Pengaduan',
  'Jumlah Pelaksana',
  'Jaminan Pelayanan',
  'Jaminan Keamanan dan Keselamatan Pelayanan',
  'Evaluasi Kinerja Pelaksana',
];

async function main() {
  console.log('Seeding initial SP Template...');

  const existingTemplate = await prisma.template.findFirst({
    where: { title: 'Standar Pelayanan Publik' },
  });

  if (existingTemplate) {
    console.log('Default template already exists. Skipping seed.');
    return;
  }

  const template = await prisma.template.create({
    data: {
      title: 'Standar Pelayanan Publik',
      description: 'Template Standar Pelayanan Publik resmi dengan 14 Komponen Standar',
      versions: {
        create: {
          version: 1,
          components: {
            create: initialComponents.map((name, index) => ({
              order: index + 1,
              name,
              defaultUraian: `<p>Isikan uraian untuk <strong>${name}</strong> di sini.</p>`,
            })),
          },
        },
      },
    },
    include: {
      versions: {
        include: {
          components: true,
        },
      },
    },
  });

  console.log(
    `Created template "${template.title}" with version 1 and ${template.versions[0].components.length} components.`
  );
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
