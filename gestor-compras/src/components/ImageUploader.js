import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios'; // Asegúrate de instalar axios

const ImageUploader = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState([]);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    
    if (files.length === 0) {
      toast.warn('Solo se permiten archivos de imagen');
      return;
    }

    setIsUploading(true);
    const uploadPromises = files.map(file => {
      const formData = new FormData();
      formData.append('image', file);
      return axios.post('/api/upload', formData); // Endpoint del backend
    });

    try {
      const responses = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...responses.map(res => res.data.url)]);
      toast.success('Imágenes subidas correctamente');
    } catch (error) {
      toast.error('Error al subir imágenes');
    } finally {
      setIsUploading(false);
    }
  }, []);

  return (
    <div 
      className="image-uploader"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {isUploading ? (
        <p>Subiendo imágenes...</p>
      ) : (
        <p>Arrastra imágenes aquí o haz clic para seleccionar</p>
      )}
      <div className="image-preview">
        {images.map((img, index) => (
          <div key={index} className="image-item">
            <img src={img} alt={`Imagen ${index}`} />
            <button onClick={() => deleteImage(img)}>Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageUploader;