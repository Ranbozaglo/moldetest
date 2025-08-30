"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const PopupContext = React.createContext()

// Global popup instance for use outside of React components
let globalPopupInstance = null

export const PopupProvider = ({ children }) => {
  const [popup, setPopup] = React.useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info", // "info", "success", "warning", "error"
    onConfirm: null,
    showCancel: false,
  })

  const showPopup = React.useCallback((options) => {
    setPopup({
      isOpen: true,
      title: options.title || "Information",
      message: options.message || "",
      type: options.type || "info",
      onConfirm: options.onConfirm || null,
      showCancel: options.showCancel || false,
    })
  }, [])

  const hidePopup = React.useCallback(() => {
    setPopup(prev => ({ ...prev, isOpen: false }))
  }, [])

  const handleConfirm = React.useCallback(() => {
    if (popup.onConfirm) {
      popup.onConfirm()
    }
    hidePopup()
  }, [popup.onConfirm, hidePopup])

  // Store global instance
  React.useEffect(() => {
    globalPopupInstance = { showPopup, hidePopup }
    window.showPopup = showPopup
    window.hidePopup = hidePopup
    
    return () => {
      globalPopupInstance = null
      delete window.showPopup
      delete window.hidePopup
    }
  }, [showPopup, hidePopup])

  const value = {
    showPopup,
    hidePopup,
  }

  return (
    <PopupContext.Provider value={value}>
      {children}
      <AlertDialog open={popup.isOpen} onOpenChange={setPopup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={getTitleColor(popup.type)}>
              {popup.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {popup.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {popup.showCancel && (
              <AlertDialogAction
                variant="outline"
                onClick={hidePopup}
                className="mr-2"
              >
                Cancel
              </AlertDialogAction>
            )}
            <AlertDialogAction onClick={handleConfirm}>
              {popup.onConfirm ? "OK" : "Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PopupContext.Provider>
  )
}

const getTitleColor = (type) => {
  switch (type) {
    case "success":
      return "text-green-600"
    case "warning":
      return "text-yellow-600"
    case "error":
      return "text-red-600"
    default:
      return "text-blue-600"
  }
}

export const usePopup = () => {
  const context = React.useContext(PopupContext)
  if (!context) {
    throw new Error("usePopup must be used within a PopupProvider")
  }
  return context
}

// Convenience functions for common alert types
export const showAlert = (message, title = "Information", type = "info") => {
  if (globalPopupInstance) {
    globalPopupInstance.showPopup({ message, title, type })
  } else if (window.showPopup) {
    window.showPopup({ message, title, type })
  }
}

export const showSuccess = (message, title = "Success") => {
  showAlert(message, title, "success")
}

export const showWarning = (message, title = "Warning") => {
  showAlert(message, title, "warning")
}

export const showError = (message, title = "Error") => {
  showAlert(message, title, "error")
}
