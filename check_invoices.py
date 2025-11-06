import os
from prisma import Prisma

async def main():
    prisma = Prisma()
    await prisma.connect()
    
    invoices = await prisma.rechnung.find_many()
    
    for invoice in invoices:
        print(f"Invoice {invoice.rechnungsnummer}: dateipfad={invoice.dateipfad}")
    
    await prisma.disconnect()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
