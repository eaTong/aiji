import { defineStore } from 'pinia'
import { ref } from 'vue'
import { WeightRecord, MeasurementRecord, ProgressPhoto } from '../types'

export const useBodyDataStore = defineStore('bodyData', () => {
  const weightRecords = ref<WeightRecord[]>([])
  const measurementRecords = ref<MeasurementRecord[]>([])
  const progressPhotos = ref<ProgressPhoto[]>([])

  function setWeightRecords(records: WeightRecord[]) {
    weightRecords.value = records
  }

  function setMeasurementRecords(records: MeasurementRecord[]) {
    measurementRecords.value = records
  }

  function setProgressPhotos(photos: ProgressPhoto[]) {
    progressPhotos.value = photos
  }

  return {
    weightRecords,
    measurementRecords,
    progressPhotos,
    setWeightRecords,
    setMeasurementRecords,
    setProgressPhotos,
  }
})