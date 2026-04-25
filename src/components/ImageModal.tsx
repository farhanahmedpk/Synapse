import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, Maximize2 } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
}

export function ImageModal({ isOpen, onClose, imageUrl, imageName }: ImageModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-full max-h-full flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-12 left-0 right-0 flex justify-between items-center text-white">
              <span className="text-sm font-medium truncate max-w-[200px]">{imageName}</span>
              <div className="flex items-center gap-4">
                <a 
                  href={imageUrl} 
                  download={imageName}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  title="Download Image"
                >
                  <Download size={20} />
                </a>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <img 
              src={imageUrl} 
              alt={imageName} 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl selection:bg-transparent"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
