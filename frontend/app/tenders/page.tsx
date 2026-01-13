import { Metadata } from 'next'
import TenderManagement from '@/components/TenderManagement'

export const metadata: Metadata = {
  title: 'Tender Management | Enterprise Management Suite',
  description: 'Manage tenders, documents, and EMD tracking',
}

export default function TendersPage() {
  return <TenderManagement />
}