import { prisma } from '@/lib/prisma';

export class CustomerIdGeneratorService {
  private static async getNextSequence(): Promise<number> {
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { customerId: true }
    });

    if (!lastCustomer) {
      return 1;
    }

    const match = lastCustomer.customerId.match(/CUS-(\d+)/);
    return match ? parseInt(match[1], 10) + 1 : 1;
  }

  static async generateCustomerId(): Promise<string> {
    const sequence = await this.getNextSequence();
    return `CUS-${sequence.toString().padStart(3, '0')}`;
  }
}
