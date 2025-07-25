import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface WallpaperModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: {
    text: string;
    onPress: () => void;
    icon?: string;
  }[];
}

const WallpaperModal: React.FC<WallpaperModalProps> = ({ visible, onClose, title, options }) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={styles.modalContainer}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
        >
          <Text style={styles.modalTitle}>{title}</Text>
          
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.modalOption}
              onPress={() => {
                option.onPress();
                onClose();
              }}
              activeOpacity={0.7}
            >
              {option.icon && (
                <Ionicons 
                  name={option.icon as any} 
                  size={20} 
                  color="white" 
                  style={styles.optionIcon} 
                />
              )}
              <Text style={styles.modalOptionText}>{option.text}</Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.modalCancel}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContainer: {
    width: width - 60,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  optionIcon: {
    marginRight: 10,
  },
  modalOptionText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
  },
  modalCancel: {
    marginTop: 15,
    paddingVertical: 15,
    backgroundColor: 'rgba(255,107,157,0.2)',
    borderRadius: 10,
  },
  modalCancelText: {
    color: '#FF6B9D',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default WallpaperModal;