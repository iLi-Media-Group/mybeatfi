import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

export interface LicenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  licenseType: string;
  price: number;
}

export function LicenseDialog({ isOpen, onClose, onConfirm, licenseType, price }: LicenseDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirm License Purchase</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <p>You are about to purchase a {licenseType} license for ${price}.</p>
            <p>Please confirm your purchase to continue.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm Purchase</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}