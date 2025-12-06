import prisma from "./dist/src/lib/prisma.js";

const run = async () => {
  try {
    const count = await prisma.rFQ.count();
    console.log("RFQs:", count);
  } catch (e) {
    console.error("DB ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
};

run();
