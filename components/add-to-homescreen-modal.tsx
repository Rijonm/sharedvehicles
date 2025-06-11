"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Apple, Smartphone, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AddToHomescreenModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddToHomescreenModal({ open, onOpenChange }: AddToHomescreenModalProps) {
  const [activeTab, setActiveTab] = useState("iphone")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95%] sm:max-w-[420px] p-4 z-[9999] rounded-lg">
        <DialogHeader className="flex flex-row items-center justify-between p-0 space-y-0 mb-3">
          <DialogTitle className="text-lg">Zum Home-Bildschirm hinzufügen</DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full absolute -top-2 -right-2 bg-white shadow-sm border"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Schließen</span>
            </Button>
          </DialogClose>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">Für schnelleren Zugriff auf die App.</p>
        <Tabs defaultValue="iphone" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="iphone" className="flex items-center gap-1.5 text-sm py-1.5">
              <Apple className="h-3.5 w-3.5" />
              <span>iPhone</span>
            </TabsTrigger>
            <TabsTrigger value="android" className="flex items-center gap-1.5 text-sm py-1.5">
              <Smartphone className="h-3.5 w-3.5" />
              <span>Android</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="iphone" className="mt-3">
            <div className="flex flex-col items-center">
              <img
                src="/iphone-add-to-homescreen.gif"
                alt="iPhone Anleitung"
                className="rounded-lg border shadow-sm max-w-full h-auto max-h-[240px] object-contain"
              />
              <ol className="text-sm mt-3 space-y-1.5 self-start pl-5">
                <li>Tippe auf das Teilen-Symbol</li>
                <li>Wähle "Zum Home-Bildschirm"</li>
                <li>Tippe auf "Hinzufügen"</li>
              </ol>
            </div>
          </TabsContent>
          <TabsContent value="android" className="mt-3">
            <div className="flex flex-col items-center">
              <img
                src="/android-add-to-homescreen.gif"
                alt="Android Anleitung"
                className="rounded-lg border shadow-sm max-w-full h-auto max-h-[240px] object-contain"
              />
              <ol className="text-sm mt-3 space-y-1.5 self-start pl-5">
                <li>Tippe auf die drei Punkte (⋮)</li>
                <li>Wähle "Zum Startbildschirm"</li>
                <li>Bestätige mit "Hinzufügen"</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
