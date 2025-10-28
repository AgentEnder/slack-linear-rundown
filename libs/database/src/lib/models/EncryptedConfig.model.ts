import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'EncryptedConfig',
  timestamps: true,
  underscored: true,
})
export class EncryptedConfig extends Model {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
  })
  key!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  encrypted_value!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  iv!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  auth_tag!: string;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    field: 'created_at',
  })
  created_at!: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    field: 'updated_at',
  })
  updated_at!: Date;
}
