import AppKit
let size = 1024
let image = NSImage(size: NSSize(width:size,height:size))
image.lockFocus()
NSColor(calibratedRed:0.22,green:0.36,blue:0.26,alpha:1).setFill()
NSBezierPath(roundedRect:NSRect(x:40,y:40,width:944,height:944),xRadius:210,yRadius:210).fill()
let paragraph = NSMutableParagraphStyle(); paragraph.alignment = .center
let attributes: [NSAttributedString.Key:Any] = [.font:NSFont.systemFont(ofSize:370,weight:.medium),.foregroundColor:NSColor(calibratedRed:0.95,green:0.96,blue:0.9,alpha:1),.paragraphStyle:paragraph]
("M↓" as NSString).draw(in:NSRect(x:50,y:310,width:924,height:450),withAttributes:attributes)
image.unlockFocus()
let bitmap = NSBitmapImageRep(data:image.tiffRepresentation!)!
try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[1]))
