"use client"

import { useEffect, useState } from "react"
import { Button } from "./ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "./ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "./ui/select"
import { Textarea } from "./ui/textarea"
import { showToast } from "@/lib/toast-utils"

interface RejectedAttendance {
    id: string
    employeeId: string
    employeeName: string
}

export function ReEnableClockInDialog({ adminId }: { adminId: string }) {
    const [attendanceId, setAttendanceId] = useState("")
    const [reason, setReason] = useState("")
    const [rejectedAttendances, setRejectedAttendances] = useState<RejectedAttendance[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    // Fetch rejected attendances when dialog opens
    useEffect(() => {
        if (!open) return

        const API_BASE =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"

        fetch(`${API_BASE}/attendance/admin/rejected`, { credentials: "include" })
            .then(res => res.json())
            .then(data => {
                setRejectedAttendances(data.data || [])
            })
            .catch(() => {
                showToast.error("Failed to load rejected attendances")
            })
    }, [open])

    const handleReEnable = async () => {
        if (!attendanceId) {
            showToast.error("Please select an employee")
            return
        }

        setLoading(true)
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"

            const res = await fetch(`${API_BASE}/attendance/admin/re-enable`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    attendanceId,
                    adminId,
                    reason
                })
            })


            const data = await res.json()

            if (data.success) {
                showToast.success(data.message)
                setOpen(false)
                setAttendanceId("")
                setReason("")
                // Refresh the rejected attendances list
                const rejectedRes = await fetch(`${API_BASE}/attendance/admin/rejected`, {
                    credentials: "include"
                })
                const rejectedData = await rejectedRes.json()
                setRejectedAttendances(rejectedData.data || [])
            } else {
                showToast.error(data.message)
            }
        } catch {
            showToast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive">
                    Re-Enable Clock-In
                </Button>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Re-Enable Employee Clock-In</DialogTitle>
                </DialogHeader>

                <Select onValueChange={setAttendanceId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                        {rejectedAttendances.map(a => (
                            <SelectItem key={a.id} value={a.id}>
                                {a.employeeName} ({a.employeeId})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Textarea
                    placeholder="Reason (optional)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />

                <Button
                    onClick={handleReEnable}
                    disabled={loading}
                    className="w-full"
                >
                    {loading ? "Re-enabling..." : "Re-Enable Clock-In"}
                </Button>
            </DialogContent>
        </Dialog>
    )
}
