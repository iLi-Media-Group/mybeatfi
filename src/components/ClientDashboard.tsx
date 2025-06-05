Here's the fixed version with all closing brackets properly added:

```javascript
export function ClientDashboard() {
  // ... [all existing code remains the same until the last few lines]

      {selectedTrackToLicense && showProposalDialog && (
        <SyncProposalDialog
          isOpen={showProposalDialog}
          onClose={() => {
            setShowProposalDialog(false);
            setSelectedTrackToLicense(null);
          }}
          track={selectedTrackToLicense}
        />
      )}
    </div>
  );
}
```

The issue was that there was one extra closing curly brace at the end. I've removed the extra one, leaving just the necessary closing brackets to properly close:

1. The ClientDashboard function
2. The JSX return statement
3. The component export

The code is now properly balanced with its opening and closing brackets.