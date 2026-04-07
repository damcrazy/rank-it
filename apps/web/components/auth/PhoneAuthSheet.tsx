"use client"

import { useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

type Step = "phone" | "otp"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after successful verification */
  onVerified: () => void
}

export function PhoneAuthSheet({ open, onOpenChange, onVerified }: Props) {
  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendOtp() {
    const supabase = getSupabaseBrowserClient()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setStep("otp")
  }

  async function verifyOtp() {
    const supabase = getSupabaseBrowserClient()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    onVerified()
    onOpenChange(false)
    // Reset state for next time
    setStep("phone")
    setPhone("")
    setOtp("")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-10">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-bold">Verify your number</SheetTitle>
          <SheetDescription>
            We use your phone number to prevent spam. One number = one voice on the board.
          </SheetDescription>
        </SheetHeader>

        {step === "phone" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                autoFocus
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button onClick={sendOtp} disabled={loading || phone.length < 8}>
              {loading ? "Sending…" : "Send OTP"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="otp">Enter the 6-digit code sent to {phone}</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                autoFocus
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button onClick={verifyOtp} disabled={loading || otp.length !== 6}>
              {loading ? "Verifying…" : "Verify & Continue"}
            </Button>
            <button
              className="text-muted-foreground text-sm underline-offset-2 hover:underline"
              onClick={() => { setStep("phone"); setOtp(""); setError(null) }}
            >
              Use a different number
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
