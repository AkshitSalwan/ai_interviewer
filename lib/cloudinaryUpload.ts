import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export class CloudinaryUploader {
  async uploadVideo(
    videoBlob: Blob,
    filename: string,
    options: {
      folder?: string
      quality?: string
      format?: string
      transformation?: any[]
    } = {}
  ): Promise<any> {
    try {
      const buffer = await this.blobToBuffer(videoBlob)
      
      const uploadOptions = {
        resource_type: 'video' as const,
        folder: options.folder || 'interviews/videos',
        public_id: filename,
        quality: options.quality || 'auto:low', // Compress for faster upload
        format: options.format || 'mp4',
        transformation: options.transformation || [
          { width: 640, height: 480, crop: 'scale' }, // Reduce size
          { quality: 'auto:low' },
          { fetch_format: 'auto' }
        ],
        eager: [
          { width: 320, height: 240, crop: 'scale', format: 'mp4' }, // Thumbnail version
        ],
      }

      const result = await cloudinary.uploader.upload(
        `data:video/webm;base64,${buffer.toString('base64')}`,
        uploadOptions
      )

      return {
        url: result.secure_url,
        publicId: result.public_id,
        duration: result.duration,
        format: result.format,
        bytes: result.bytes,
        eager: result.eager
      }

    } catch (error) {
      console.error('Error uploading video to Cloudinary:', error)
      throw error
    }
  }

  async uploadAudio(
    audioBlob: Blob,
    filename: string,
    options: {
      folder?: string
      quality?: string
    } = {}
  ): Promise<any> {
    try {
      const buffer = await this.blobToBuffer(audioBlob)
      
      const uploadOptions = {
        resource_type: 'video' as const, // Audio files use 'video' resource type
        folder: options.folder || 'interviews/audio',
        public_id: filename,
        quality: options.quality || 'auto:low',
      }

      const result = await cloudinary.uploader.upload(
        `data:audio/webm;base64,${buffer.toString('base64')}`,
        uploadOptions
      )

      return {
        url: result.secure_url,
        publicId: result.public_id,
        duration: result.duration,
        format: result.format,
        bytes: result.bytes
      }

    } catch (error) {
      console.error('Error uploading audio to Cloudinary:', error)
      throw error
    }
  }

  async uploadImage(
    imageBlob: Blob,
    filename: string,
    options: {
      folder?: string
      quality?: string
      transformation?: any[]
    } = {}
  ): Promise<any> {
    try {
      const buffer = await this.blobToBuffer(imageBlob)
      
      const uploadOptions = {
        resource_type: 'image' as const,
        folder: options.folder || 'interviews/snapshots',
        public_id: filename,
        quality: options.quality || 'auto:good',
        transformation: options.transformation || [
          { width: 400, height: 300, crop: 'scale' },
          { quality: 'auto:good' }
        ],
      }

      const result = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${buffer.toString('base64')}`,
        uploadOptions
      )

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      }

    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error)
      throw error
    }
  }

  async generateVideoThumbnail(publicId: string): Promise<string> {
    try {
      return cloudinary.url(publicId, {
        resource_type: 'video',
        transformation: [
          { width: 320, height: 240, crop: 'scale' },
          { quality: 'auto:good' },
          { format: 'jpg' }
        ]
      })
    } catch (error) {
      console.error('Error generating video thumbnail:', error)
      throw error
    }
  }

  async deleteFile(publicId: string, resourceType: 'image' | 'video' = 'video'): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      })
      return result
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error)
      throw error
    }
  }

  async getFileInfo(publicId: string, resourceType: 'image' | 'video' = 'video'): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType
      })
      return result
    } catch (error) {
      console.error('Error getting file info from Cloudinary:', error)
      throw error
    }
  }

  private async blobToBuffer(blob: Blob): Promise<Buffer> {
    const arrayBuffer = await blob.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  // Helper method to create optimized video URL
  getOptimizedVideoUrl(
    publicId: string,
    options: {
      width?: number
      height?: number
      quality?: string
      format?: string
    } = {}
  ): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      transformation: [
        { 
          width: options.width || 640, 
          height: options.height || 480, 
          crop: 'scale' 
        },
        { quality: options.quality || 'auto:low' },
        { format: options.format || 'mp4' }
      ]
    })
  }

  // Helper method to create streaming URL
  getStreamingUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      streaming_profile: 'hd',
      format: 'm3u8'
    })
  }
}

export const cloudinaryUploader = new CloudinaryUploader()

// Helper function for client-side uploads
export async function uploadInterviewData(
  videoBlob: Blob,
  audioBlob: Blob,
  metadata: {
    candidateId: string
    interviewId: string
    timestamp: string
    duration: number
  }
): Promise<{
  videoUrl: string
  audioUrl: string
  metadata: any
}> {
  try {
    const uploader = new CloudinaryUploader()
    
    const videoFilename = `${metadata.candidateId}_${metadata.interviewId}_video`
    const audioFilename = `${metadata.candidateId}_${metadata.interviewId}_audio`

    const [videoResult, audioResult] = await Promise.all([
      uploader.uploadVideo(videoBlob, videoFilename, {
        folder: 'interviews/videos',
        quality: 'auto:low'
      }),
      uploader.uploadAudio(audioBlob, audioFilename, {
        folder: 'interviews/audio',
        quality: 'auto:low'
      })
    ])

    return {
      videoUrl: videoResult.url,
      audioUrl: audioResult.url,
      metadata: {
        ...metadata,
        videoPublicId: videoResult.publicId,
        audioPublicId: audioResult.publicId,
        videoDuration: videoResult.duration,
        videoSize: videoResult.bytes,
        audioSize: audioResult.bytes
      }
    }

  } catch (error) {
    console.error('Error uploading interview data:', error)
    throw error
  }
}
