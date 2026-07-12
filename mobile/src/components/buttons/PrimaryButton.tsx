import React from 'react';
import {StyleSheet} from 'react-native';
import {Button} from 'react-native-paper';

export default function PrimaryButton({
  title,
  onPress,
}:{
  title:string;
  onPress:()=>void;
}){

  return(
    <Button
      mode="contained"
      onPress={onPress}
      style={styles.button}
      contentStyle={styles.content}>

      {title}

    </Button>
  );
}

const styles=StyleSheet.create({

button:{
borderRadius:15
},

content:{
paddingVertical:8
}

});