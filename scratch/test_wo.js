const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function test() {
  try {
    console.log("Querying first work order...");
    const firstWO = await prisma.workOrder.findFirst();
    if (!firstWO) {
      console.log("No work orders found!");
      return;
    }
    const id = firstWO.id;
    console.log("Using work order ID:", id);
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        contractor: { select: { id: true, name: true, email: true, image: true, phone: true } },
        coordinator: { select: { id: true, name: true, email: true, phone: true, image: true } },
        processor: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        property: true,
        files: {
          select: {
            id: true, filename: true, originalName: true, mimeType: true,
            size: true, path: true, category: true, createdAt: true,
            uploader: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        threads: {
          include: {
            messages: {
              include: { author: { select: { id: true, name: true, image: true } } },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
          take: 10,
        },
        invoices: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        history: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    console.log("Successfully fetched work order:", !!workOrder);
    if (!workOrder) return;

    let property = workOrder.property;
    console.log("Property address:", property?.address);

    const propertyPhotoDelegate = prisma.propertyPhoto;
    console.log("propertyPhotoDelegate exists:", !!propertyPhotoDelegate);

    const propertyFrontPhotos = propertyPhotoDelegate
      ? await propertyPhotoDelegate.findMany({
          where: { propertyId: property.id, category: "FRONT" },
          orderBy: { createdAt: "desc" },
          take: 1,
        })
      : [];
    console.log("propertyFrontPhotos:", propertyFrontPhotos);

    // Test R2 signer
    const getR2Url = (path) => path; // Mock
    const [resolvedFiles, resolvedFrontPhotos, resolvedTasks, resolvedBids, resolvedInspectionItems] = await Promise.all([
      Promise.all(
        (workOrder.files || []).map(async (f) => ({
          ...f,
          path: await getR2Url(f.path),
        }))
      ),
      Promise.all(
        propertyFrontPhotos.map(async (p) => ({
          ...p,
          path: await getR2Url(p.path),
        }))
      ),
      Promise.all(
        (Array.isArray(workOrder.tasks) ? workOrder.tasks : []).map(async (task) => {
          const resolvedPhotos = await Promise.all(
            (Array.isArray(task?.photos) ? task.photos : []).map(async (photo) => ({
              ...photo,
              url: await getR2Url(photo?.url || photo?.path),
              path: await getR2Url(photo?.path || photo?.url),
            }))
          );
          return {
            ...task,
            photos: resolvedPhotos,
          };
        })
      ),
      Promise.all(
        (Array.isArray(workOrder.metadata?.bids) ? workOrder.metadata.bids : []).map(async (bid) => {
          const resolvedPhotos = await Promise.all(
            (Array.isArray(bid?.photos) ? bid.photos : []).map(async (photo) => ({
              ...photo,
              url: await getR2Url(photo?.url || photo?.path),
              path: await getR2Url(photo?.path || photo?.url),
            }))
          );
          return {
            ...bid,
            photos: resolvedPhotos,
          };
        })
      ),
      Promise.all(
        (Array.isArray(workOrder.metadata?.inspectionItems) ? workOrder.metadata.inspectionItems : []).map(async (item) => {
          const resolvedPhotos = await Promise.all(
            (Array.isArray(item?.photos) ? item.photos : []).map(async (photo) => ({
              ...photo,
              url: await getR2Url(photo?.url || photo?.path),
              path: await getR2Url(photo?.path || photo?.url),
            }))
          );
          return {
            ...item,
            photos: resolvedPhotos,
          };
        })
      ),
    ]);

    console.log("Mapping resolution succeeded!");

  } catch (err) {
    console.error("CRASHED:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
